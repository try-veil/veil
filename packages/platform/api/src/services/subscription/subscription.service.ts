import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GatewayService } from '../onboarding/gateway.service';
import {
  SubscriptionResponseDto,
  SubscriptionDetailsResponseDto,
  SubscriptionListResponseDto,
  SubscriptionCancellationResponseDto,
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
} from './dto/subscription.dto';
import { SubscriptionStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gatewayService: GatewayService,
  ) { }

  async create(
    createDto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    // Validate that project exists and get tenant info
    const project = await this.prisma.project.findUnique({
      where: { id: createDto.projectId },
      include: { tenant: true },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${createDto.projectId} not found`);
    }

    // Validate that API exists
    const api = await this.prisma.api.findUnique({
      where: { id: createDto.apiId },
    });
    if (!api) {
      throw new NotFoundException(`API with ID ${createDto.apiId} not found`);
    }

    // Validate that tenant ID matches the project's tenant
    if (createDto.tenantId !== project.tenantId) {
      throw new BadRequestException('Tenant ID must match the project\'s tenant');
    }

    const existingSubscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId: createDto.tenantId,
        status: 'ACTIVE',
      },
    });

    if (existingSubscription) {
      throw new ConflictException(
        'An active subscription already exists for this tenant',
      );
    }

    const apiKey = this.generateApiKey();

    const subscription = await this.prisma.subscription.create({
      data: {
        name: createDto.name,
        planId: createDto.planId,
        tenantId: createDto.tenantId,
        apiId: createDto.apiId,
        userId: createDto.userId,
        projectId: createDto.projectId,
        apiKey,
        status: 'ACTIVE',
      },
      include: {
        plan: true,
      },
    });

    return this.mapToResponseDto(subscription);
  }

  async findById(id: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    return this.mapToResponseDto(subscription);
  }

  async findByTenantId(tenantId: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException(
        `No active subscription found for tenant ${tenantId}`,
      );
    }

    return this.mapToResponseDto(subscription);
  }

  async update(
    id: string,
    updateDto: UpdateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.prisma.subscription.update({
      where: { id },
      data: {
        ...(updateDto.name && { name: updateDto.name }),
        ...(updateDto.planId && { planId: updateDto.planId }),
        ...(updateDto.status && { status: updateDto.status }),
      },
      include: {
        plan: true,
      },
    });

    return this.mapToResponseDto(subscription);
  }

  async deactivate(id: string): Promise<SubscriptionResponseDto> {
    // First check if subscription exists
    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        plan: true,
      },
    });

    if (!existingSubscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    console.log(`[SubscriptionService] Deactivating subscription ${id}, current status: ${existingSubscription.status}`);

    const subscription = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: 'INACTIVE',
      },
    });

    console.log(`[SubscriptionService] Subscription ${id} updated, new status: ${subscription.status}`);

    return this.mapToResponseDto(subscription);
  }

  async regenerateApiKey(id: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.prisma.subscription.update({
      where: { id },
      data: {
        apiKey: this.generateApiKey(),
      },
      include: {
        plan: true,
      },
    });

    return this.mapToResponseDto(subscription);
  }

  private mapToResponseDto(subscription: any): SubscriptionResponseDto {
    return {
      id: subscription.id,
      name: subscription.name,
      planId: subscription.planId,
      planName: subscription.plan?.name,
      tenantId: subscription.tenantId,
      apiId: subscription.apiId,
      userId: subscription.userId,
      projectId: subscription.projectId,
      apiKey: subscription.apiKey,
      status: subscription.status,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
      usageStats: subscription.usageStats,
    };
  }

  async getSubscriptionDetails(
    subscriptionId: string,
    userId: string,
  ): Promise<SubscriptionDetailsResponseDto> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId,
      },
      include: {
        api: true,
        plan: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Get usage statistics
    const usageStats = await this.getUsageStats(subscriptionId);

    return {
      subscription_id: subscription.id,
      api_id: subscription.apiId,
      api_name: subscription.api?.name,
      api_key: subscription.apiKey,
      status: subscription.status,
      plan_id: subscription.planId,
      plan_name: subscription.plan?.name,
      created_at: subscription.createdAt,
      updated_at: subscription.updatedAt,
      last_used: subscription.lastUsed,
      usage_stats: usageStats,
    };
  }

  async listSubscriptions(
    userId: string,
    status?: SubscriptionStatus,
    page = 1,
    limit = 10,
  ): Promise<SubscriptionListResponseDto> {
    const where = {
      userId,
      ...(status && { status }),
    };

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        include: {
          api: true,
          plan: true,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      items: subscriptions.map((sub) => ({
        subscription_id: sub.id,
        api_id: sub.apiId,
        api_name: sub.api?.name,
        api_key: sub.apiKey,
        status: sub.status,
        plan_id: sub.planId,
        plan_name: sub.plan?.name,
        created_at: sub.createdAt,
        updated_at: sub.updatedAt,
        last_used: sub.lastUsed,
        usage_stats: null,
      })),
      total,
      page,
      limit,
    };
  }

  async cancelSubscription(
    subscriptionId: string,
    userId: string,
  ): Promise<SubscriptionCancellationResponseDto> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Try to delete API key from gateway, but don't fail if it doesn't exist
    try {
      await this.gatewayService.deleteApiKey(subscription.apiKey);
      this.logger.log(`API key deleted from gateway for subscription ${subscriptionId}`);
    } catch (error) {
      // Log the error but continue with cancellation
      this.logger.warn(
        `Failed to delete API key from gateway for subscription ${subscriptionId}: ${error.message}. Continuing with cancellation.`
      );
    }

    // Update subscription status
    const updatedSubscription = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    return {
      subscription_id: updatedSubscription.id,
      status: updatedSubscription.status,
      cancelled_at: updatedSubscription.cancelledAt,
    };
  }

  private async getUsageStats(subscriptionId: string) {
    // Get usage statistics from database
    const totalCalls = await this.prisma.apiUsage.count({
      where: { subscriptionId },
    });

    const callsThisPeriod = await this.prisma.apiUsage.count({
      where: {
        subscriptionId,
        timestamp: {
          gte: new Date(new Date().setDate(1)), // First day of current month
        },
      },
    });

    return {
      total_calls: totalCalls,
      calls_this_period: callsThisPeriod,
    };
  }

  private generateApiKey(): string {
    return randomBytes(32).toString('hex');
  }
}
