import { Elysia } from 'elysia';
import { config } from '../config';
import { logger as appLogger, createRequestLogger } from '../utils/logger';

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export const logger = new Elysia()
  .derive({ as: 'global' }, ({ headers, path, request }) => {
    const requestId = headers?.['x-request-id'] || generateRequestId();
    const startTime = Date.now();
    
    // Create request-scoped logger
    const requestLogger = createRequestLogger(requestId);
    
    return { 
      requestId,
      startTime,
      requestLogger
    };
  })
  .onRequest(({ request, requestId, requestLogger, headers }) => {
    const method = request.method;
    const url = new URL(request.url).pathname;
    const userAgent = headers?.['user-agent'] || headers?.['User-Agent'] || 'Unknown';
    const ipAddress = headers?.['x-forwarded-for'] || headers?.['x-real-ip'] || 'Unknown';
    
    // Log API request with structured logging
    if (requestLogger && typeof requestLogger.logApiRequest === 'function') {
      requestLogger.logApiRequest({
        method,
        url,
        userAgent,
        ipAddress,
        requestId,
        query: Object.fromEntries(new URL(request.url).searchParams),
        headers: headers ? Object.fromEntries(Object.entries(headers)) : {},
      });
    }
    
    // Legacy console logging for development
    if (config.isDevelopment) {
      console.log(`[${new Date().toISOString()}] ${requestId} ${method} ${url} - ${userAgent}`);
    }
  })
  .onAfterResponse(({ request, set, requestId, startTime, requestLogger, headers }) => {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const method = request.method;
    const url = new URL(request.url).pathname;
    const status = set.status || 200;
    
    // Log API response with structured logging
    if (requestLogger && typeof requestLogger.logApiResponse === 'function') {
      requestLogger.logApiResponse({
        requestId,
        statusCode: status,
        duration,
        responseSize: headers?.['content-length'] ? parseInt(headers['content-length']) : undefined,
      });
    }
    
    // Log performance metrics for slow requests
    if (duration > 1000 && requestLogger && typeof requestLogger.logPerformanceMetric === 'function') { // > 1 second
      requestLogger.logPerformanceMetric({
        name: 'slow_request',
        value: duration,
        unit: 'ms',
        requestId,
        endpoint: url,
        metadata: {
          method,
          statusCode: status,
        }
      });
    }
    
    // Log security events for failed authentication/authorization
    if (requestLogger && typeof requestLogger.logSecurityEvent === 'function') {
      if (status === 401) {
        requestLogger.logSecurityEvent({
          type: 'authentication_failed',
          message: `Authentication failed for ${method} ${url}`,
          requestId,
          ipAddress: headers?.['x-forwarded-for'] || headers?.['x-real-ip'] || 'Unknown',
          userAgent: headers?.['user-agent'] || headers?.['User-Agent'] || 'Unknown',
        });
      } else if (status === 403) {
        requestLogger.logSecurityEvent({
          type: 'authorization_failed',
          message: `Authorization failed for ${method} ${url}`,
          requestId,
          ipAddress: headers?.['x-forwarded-for'] || headers?.['x-real-ip'] || 'Unknown',
          userAgent: headers?.['user-agent'] || headers?.['User-Agent'] || 'Unknown',
        });
      }
    }
    
    // Legacy console logging for development
    if (config.isDevelopment) {
      const logLevel = status >= 400 ? 'ERROR' : 'INFO';
      const statusColor = status >= 400 ? '\x1b[31m' : status >= 300 ? '\x1b[33m' : '\x1b[32m';
      const resetColor = '\x1b[0m';
      
      console.log(
        `[${new Date().toISOString()}] [${logLevel}] ${requestId} ${method} ${url} - ${statusColor}${status}${resetColor} (${duration}ms)`
      );
    }
  })
  .onError(({ error, requestId, requestLogger }) => {
    // Log errors with full context
    if (requestLogger && typeof requestLogger.error === 'function') {
      requestLogger.error(
        'Request processing failed',
        error,
        { requestId },
        {
          type: 'request_error',
          errorType: error.constructor.name,
        }
      );
    }
  });