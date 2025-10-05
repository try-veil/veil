import { proxyApiRepository } from '../repositories/proxy-api-repository';
import { proxyRouteRepository } from '../repositories/proxy-route-repository';
import { pricingModelRepository } from '../repositories/pricing-model-repository';
import { usageRecordRepository } from '../repositories/usage-record-repository';
import { creditReservationService } from './credit-reservation-service';
import { pricingService } from './pricing-service';
import {
  ProxyApi,
  ProxyRoute,
  PricingModel,
  ProxyRequestContext,
  ProxyRequestMetrics,
  CostCalculationResult,
} from '../types';

export class ProxyService {
  /**
   * Prepare proxy context - load API, route, and pricing configuration
   */
  async prepareProxyContext(
    apiSlug: string,
    method: string,
    path: string,
    userId: number,
    subscriptionId?: number,
    apiKeyId?: number
  ): Promise<ProxyRequestContext> {
    console.log(`🔍 prepareProxyContext - apiSlug: ${apiSlug}, method: ${method}, path: ${path}, userId: ${userId}`);
    // Get API configuration
    const api = await proxyApiRepository.findBySlug(apiSlug);
    console.log(`📦 API found: ${api ? api.name : 'null'}`);
    if (!api) {
      throw new Error('API not found');
    }

    if (!api.isActive) {
      throw new Error('API is not active');
    }

    console.log(`🔎 Looking for matching route...`);
    // Try to find matching route
    const route = await proxyRouteRepository.findMatchingRoute(api.id, method, path);
    console.log(`📍 Route found: ${route ? route.pathPattern : 'null (using default)'}`);

    // Determine pricing model (route override or API default)
    let pricingModel: PricingModel | null = null;

    console.log(`💰 Loading pricing model...`);
    if (route?.pricingModelId) {
      pricingModel = await pricingModelRepository.findById(route.pricingModelId);
    } else if (api.defaultPricingModelId) {
      pricingModel = await pricingModelRepository.findById(api.defaultPricingModelId);
    }
    console.log(`💵 Pricing model found: ${pricingModel ? pricingModel.name : 'null'}`);

    if (!pricingModel) {
      throw new Error('No pricing model configured for this API');
    }

    return {
      api,
      route: route || undefined,
      pricingModel,
      userId,
      subscriptionId,
      apiKeyId,
    };
  }

  /**
   * Execute proxy request with credit reservation and settlement
   */
  async executeProxyRequest(
    context: ProxyRequestContext,
    request: {
      method: string;
      path: string;
      headers: Record<string, string>;
      body?: any;
    }
  ): Promise<{
    statusCode: number;
    headers: Record<string, string>;
    body: any;
    metrics: ProxyRequestMetrics;
    cost: CostCalculationResult;
  }> {
    console.log(`🚀 executeProxyRequest started`);
    const startTime = new Date();
    let reservation: any = null;
    let metrics: ProxyRequestMetrics = {
      startTime,
      requestSize: 0,
      responseSize: 0,
    };

    try {
      // Calculate request size
      const requestBody = request.body ? JSON.stringify(request.body) : '';
      metrics.requestSize = Buffer.byteLength(requestBody, 'utf8');
      console.log(`📏 Request size: ${metrics.requestSize} bytes`);

      // Estimate cost
      console.log(`💵 Estimating cost...`);
      const estimatedCost = await pricingService.estimateCost(
        context.pricingModel,
        metrics.requestSize
      );
      console.log(`💰 Estimated cost: ${estimatedCost}`);

      // Reserve credits
      console.log(`🔒 Reserving ${estimatedCost} credits for user ${context.userId}...`);
      try {
        reservation = await creditReservationService.reserveCredits(
          context.userId,
          estimatedCost,
          'proxy_request',
          'proxy_request',
          `${context.api.slug}:${request.path}`,
          5 // 5 minutes expiry
        );
        console.log(`✅ Credits reserved successfully:`, reservation.uid);
      } catch (error: any) {
        throw new Error(`Failed to reserve credits: ${error.message}`);
      }

      // Build upstream URL
      const upstreamUrl = this.buildUpstreamUrl(context.api, request.path);

      // Prepare headers
      const upstreamHeaders = this.prepareHeaders(context.api, request.headers);

      // Get timeout
      const timeout = (context.route?.timeoutSeconds || context.api.timeoutSeconds) * 1000;

      // Make upstream request
      const upstreamResponse = await this.makeUpstreamRequest({
        url: upstreamUrl,
        method: request.method,
        headers: upstreamHeaders,
        body: requestBody,
        timeout,
      });

      // Record metrics
      const endTime = new Date();
      metrics.endTime = endTime;
      metrics.duration = endTime.getTime() - startTime.getTime();
      metrics.responseSize = upstreamResponse.responseSize;
      metrics.statusCode = upstreamResponse.statusCode;

      // Calculate actual cost
      const costResult = await pricingService.calculateCost(
        context.pricingModel,
        metrics,
        context.userId
      );

      // Settle reservation
      await creditReservationService.settleReservation(
        reservation.uid,
        costResult.actualCost
      );

      // Record usage
      await this.recordUsage(context, metrics, costResult, reservation.uid);

      return {
        statusCode: upstreamResponse.statusCode,
        headers: upstreamResponse.headers,
        body: upstreamResponse.body,
        metrics,
        cost: costResult,
      };
    } catch (error: any) {
      // Record end time
      const endTime = new Date();
      metrics.endTime = endTime;
      metrics.duration = endTime.getTime() - startTime.getTime();

      // Release reservation if it was created
      if (reservation) {
        try {
          await creditReservationService.releaseReservation(reservation.uid);
        } catch (releaseError) {
          console.error('Failed to release reservation:', releaseError);
        }
      }

      // Record failed usage
      const zeroCost: CostCalculationResult = {
        estimatedCost: 0,
        actualCost: 0,
        breakdown: {},
        pricingModel: context.pricingModel,
      };

      await this.recordUsage(
        context,
        { ...metrics, statusCode: 500 },
        zeroCost,
        reservation?.uid,
        error.message
      );

      throw error;
    }
  }

  private buildUpstreamUrl(api: ProxyApi, path: string): string {
    const baseUrl = api.upstreamUrl.replace(/\/$/, ''); // Remove trailing slash
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  }

  private prepareHeaders(api: ProxyApi, requestHeaders: Record<string, string>): Record<string, string> {
    const headers = { ...requestHeaders };

    // Add default headers
    if (api.defaultHeaders) {
      const defaultHeaders = api.defaultHeaders as Record<string, string>;
      Object.assign(headers, defaultHeaders);
    }

    // Strip specified headers
    if (api.stripHeaders) {
      const stripHeaders = api.stripHeaders as string[];
      stripHeaders.forEach(header => {
        delete headers[header.toLowerCase()];
      });
    }

    // Always strip sensitive headers for security
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    sensitiveHeaders.forEach(header => {
      delete headers[header.toLowerCase()];
    });

    return headers;
  }

  private async makeUpstreamRequest(options: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
    timeout: number;
  }): Promise<{
    statusCode: number;
    headers: Record<string, string>;
    body: any;
    responseSize: number;
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout);

    try {
      const response = await fetch(options.url, {
        method: options.method,
        headers: options.headers,
        body: options.body || undefined,
        signal: controller.signal,
      });

      const responseBody = await response.text();
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        statusCode: response.status,
        headers: responseHeaders,
        body: responseBody,
        responseSize: Buffer.byteLength(responseBody, 'utf8'),
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw new Error(`Upstream request failed: ${error.message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async recordUsage(
    context: ProxyRequestContext,
    metrics: ProxyRequestMetrics,
    cost: CostCalculationResult,
    reservationUid?: string,
    errorMessage?: string
  ) {
    try {
      const reservation = reservationUid
        ? await creditReservationService.getReservation(reservationUid)
        : null;

      await usageRecordRepository.create({
        userId: context.userId,
        subscriptionId: context.subscriptionId,
        apiKeyId: context.apiKeyId,
        apiId: context.api.id,
        creditReservationId: reservation?.id,
        creditTransactionId: undefined, // Will be linked by settlement
        method: metrics.statusCode ? 'GET' : 'UNKNOWN', // TODO: pass actual method
        path: '', // TODO: pass actual path
        statusCode: metrics.statusCode,
        requestSize: metrics.requestSize,
        responseSize: metrics.responseSize,
        startTime: metrics.startTime,
        endTime: metrics.endTime,
        duration: metrics.duration,
        estimatedCost: cost.estimatedCost.toString(),
        actualCost: cost.actualCost.toString(),
        pricingModelId: context.pricingModel.id,
        pricingCalculation: cost.breakdown,
        errorMessage,
      });
    } catch (error) {
      console.error('Failed to record usage:', error);
      // Don't throw - usage recording failure shouldn't break the proxy
    }
  }
}

export const proxyService = new ProxyService();
