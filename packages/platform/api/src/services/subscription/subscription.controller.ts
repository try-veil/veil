import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseIntPipe,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { AuthGuard } from '../auth/auth.guard';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiBody,
    ApiQuery,
} from '@nestjs/swagger';
import {
    CreateSubscriptionDto,
    UpdateSubscriptionDto,
    SubscriptionResponseDto,
    SubscriptionDetailsResponseDto,
    SubscriptionListResponseDto,
    SubscriptionCancellationResponseDto,
} from './dto/subscription.dto';
import { SubscriptionStatus } from '@prisma/client';

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
@UseGuards(AuthGuard)
export class SubscriptionController {
    constructor(private readonly subscriptionService: SubscriptionService) { }

    @Post(':userId')
    @ApiOperation({ summary: 'Create a new subscription' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiBody({ type: CreateSubscriptionDto })
    @ApiResponse({
        status: 201,
        description: 'Subscription created successfully',
        type: SubscriptionResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Invalid request' })
    async create(
        @Param('userId') userId: string,
        @Body() createDto: CreateSubscriptionDto,
    ): Promise<SubscriptionResponseDto> {
        // Ensure the userId from the path matches the DTO
        const subscriptionData = { ...createDto, userId };
        return this.subscriptionService.create(subscriptionData);
    }

    @Get(':userId/:subscriptionId')
    @ApiOperation({ summary: 'Get subscription by ID' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiParam({ name: 'subscriptionId', description: 'Subscription ID' })
    @ApiResponse({
        status: 200,
        description: 'Returns the subscription',
        type: SubscriptionResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Subscription not found' })
    async findById(
        @Param('userId') userId: string,
        @Param('subscriptionId') subscriptionId: string
    ): Promise<SubscriptionResponseDto> {
        return this.subscriptionService.findById(subscriptionId);
    }

    @Get(':userId/tenant/:tenantId')
    @ApiOperation({ summary: 'Get active subscription by tenant ID' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
    @ApiResponse({
        status: 200,
        description: 'Returns the active subscription',
        type: SubscriptionResponseDto,
    })
    @ApiResponse({ status: 404, description: 'No active subscription found' })
    async findByTenantId(
        @Param('userId') userId: string,
        @Param('tenantId') tenantId: string,
    ): Promise<SubscriptionResponseDto> {
        return this.subscriptionService.findByTenantId(tenantId);
    }

    @Get(':userId')
    @ApiOperation({ summary: 'List subscriptions for a user' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiQuery({ name: 'status', required: false, enum: SubscriptionStatus })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({
        status: 200,
        description: 'Returns list of subscriptions',
        type: SubscriptionListResponseDto,
    })
    async listSubscriptions(
        @Param('userId') userId: string,
        @Query('status') status?: SubscriptionStatus,
        @Query('page', new ParseIntPipe({ optional: true })) page?: number,
        @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    ): Promise<SubscriptionListResponseDto> {
        return this.subscriptionService.listSubscriptions(
            userId,
            status,
            page,
            limit,
        );
    }

    @Get(':userId/:subscriptionId/details')
    @ApiOperation({ summary: 'Get detailed subscription information' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiParam({ name: 'subscriptionId', description: 'Subscription ID' })
    @ApiResponse({
        status: 200,
        description: 'Returns detailed subscription information',
        type: SubscriptionDetailsResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Subscription not found' })
    async getSubscriptionDetails(
        @Param('userId') userId: string,
        @Param('subscriptionId') subscriptionId: string,
    ): Promise<SubscriptionDetailsResponseDto> {
        return this.subscriptionService.getSubscriptionDetails(
            subscriptionId,
            userId,
        );
    }

    @Patch(':userId/:subscriptionId')
    @ApiOperation({ summary: 'Update subscription' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiParam({ name: 'subscriptionId', description: 'Subscription ID' })
    @ApiBody({ type: UpdateSubscriptionDto })
    @ApiResponse({
        status: 200,
        description: 'Subscription updated successfully',
        type: SubscriptionResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Subscription not found' })
    async update(
        @Param('userId') userId: string,
        @Param('subscriptionId') subscriptionId: string,
        @Body() updateDto: UpdateSubscriptionDto,
    ): Promise<SubscriptionResponseDto> {
        return this.subscriptionService.update(subscriptionId, updateDto);
    }

    @Patch(':userId/:subscriptionId/deactivate')
    @ApiOperation({ summary: 'Deactivate subscription' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiParam({ name: 'subscriptionId', description: 'Subscription ID' })
    @ApiResponse({
        status: 200,
        description: 'Subscription deactivated successfully',
        type: SubscriptionResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Subscription not found' })
    async deactivate(
        @Param('userId') userId: string,
        @Param('subscriptionId') subscriptionId: string
    ): Promise<SubscriptionResponseDto> {
        return this.subscriptionService.deactivate(subscriptionId);
    }

    @Patch(':userId/:subscriptionId/regenerate-key')
    @ApiOperation({ summary: 'Regenerate API key for subscription' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiParam({ name: 'subscriptionId', description: 'Subscription ID' })
    @ApiResponse({
        status: 200,
        description: 'API key regenerated successfully',
        type: SubscriptionResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Subscription not found' })
    async regenerateApiKey(
        @Param('userId') userId: string,
        @Param('subscriptionId') subscriptionId: string,
    ): Promise<SubscriptionResponseDto> {
        return this.subscriptionService.regenerateApiKey(subscriptionId);
    }

    @Delete(':userId/:subscriptionId/cancel')
    @ApiOperation({ summary: 'Cancel subscription' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiParam({ name: 'subscriptionId', description: 'Subscription ID' })
    @ApiResponse({
        status: 200,
        description: 'Subscription cancelled successfully',
        type: SubscriptionCancellationResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Subscription not found' })
    async cancelSubscription(
        @Param('userId') userId: string,
        @Param('subscriptionId') subscriptionId: string,
    ): Promise<SubscriptionCancellationResponseDto> {
        return this.subscriptionService.cancelSubscription(subscriptionId, userId);
    }
}