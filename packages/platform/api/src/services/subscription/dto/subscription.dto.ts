import {
  IsString,
  IsUUID,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  Min,
} from 'class-validator';
import { SubscriptionStatus } from '@prisma/client';

export class SubscriptionRequestDto {
  @IsUUID()
  api_id: string;

  @IsUUID()
  @IsOptional()
  plan_id?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class SubscriptionResponseDto {
  id: string;
  name: string;
  planId: string;
  tenantId: string;
  apiId: string;
  userId: string;
  projectId: number;
  apiKey: string;
  status: SubscriptionStatus;
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
  usageStats?: any;
}

export class SubscriptionDetailsResponseDto {
  subscription_id: string;
  api_id: string;
  api_name?: string;
  api_key: string;
  status: SubscriptionStatus;
  plan_id?: string;
  plan_name?: string;
  created_at: Date;
  updated_at: Date;
  last_used?: Date;
  usage_stats?: any;
}

export class SubscriptionListResponseDto {
  items: SubscriptionDetailsResponseDto[];
  total: number;
  page: number;
  limit: number;
}

export class SubscriptionCancellationResponseDto {
  subscription_id: string;
  status: SubscriptionStatus;
  cancelled_at: Date;
}

export class RegenerateKeyResponseDto {
  subscription_id: string;
  api_key: string;
  previous_key_invalidated: boolean;
}

export class CreateSubscriptionDto {
  name: string;
  planId: string;
  tenantId: string;
  apiId: string;
  userId: string;
  projectId: number;
}

export class UpdateSubscriptionDto {
  name?: string;
  planId?: string;
  status?: SubscriptionStatus;
}

export class SubscriptionUsageDto {
  @IsNumber()
  @Min(0)
  totalRequests: number;

  @IsNumber()
  @Min(0)
  remainingRequests: number;
}
