import { ApiProperty } from '@nestjs/swagger';
import {
  CreditBalance,
  CreditBalanceResponse,
  CreditUsageType,
  CreditBalanceStatus,
  CreditUsage,
} from './types';

export class CreditUsageDto implements CreditUsage {
  @ApiProperty({
    description: 'Unique ID of the credit usage',
    example: '1234-5678-90ab-cdef',
  })
  id: string;

  @ApiProperty({ description: 'User ID', example: 'user-123' })
  userId: string;

  @ApiProperty({ description: 'Amount of credits used', example: 100 })
  amount: number;

  @ApiProperty({
    description: 'Type of credit usage',
    enum: CreditUsageType,
    example: CreditUsageType.API_CALL,
  })
  type: CreditUsageType;

  @ApiProperty({
    description: 'Endpoint ID if applicable',
    example: 'endpoint-123',
    required: false,
  })
  endpointId?: string;

  @ApiProperty({
    description: 'Feature ID if applicable',
    example: 'feature-123',
    required: false,
  })
  featureId?: string;

  @ApiProperty({
    description: 'Description of the usage',
    example: 'OpenAI API call',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Additional metadata about the credit usage',
    example: { apiName: 'openai', modelName: 'gpt-4' },
    required: false,
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'When the credits were used',
    example: '2023-01-01T12:00:00Z',
  })
  createdAt: Date;
}

export class CreditBalanceDto implements CreditBalance {
  @ApiProperty({
    description: 'Unique ID of the credit balance',
    example: 'balance-123',
  })
  id: string;

  @ApiProperty({ description: 'User ID', example: 'user-123' })
  userId: string;

  @ApiProperty({ description: 'Current credit balance', example: 1000 })
  balance: number;

  @ApiProperty({
    description: 'Status of the credit balance',
    enum: CreditBalanceStatus,
    example: CreditBalanceStatus.ACTIVE,
  })
  status: CreditBalanceStatus;

  @ApiProperty({
    description: 'When the credits expire, if applicable',
    example: '2024-01-01T12:00:00Z',
    required: false,
  })
  expiresAt?: Date;

  @ApiProperty({
    description: 'When the credit balance was created',
    example: '2023-01-01T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the credit balance was last updated',
    example: '2023-01-01T12:00:00Z',
  })
  updatedAt: Date;
}

export class CreditBalanceResponseDto implements CreditBalanceResponse {
  @ApiProperty({ description: 'Current credit balance', example: 1000 })
  balance: number;

  @ApiProperty({
    description: 'Status of the credit balance',
    enum: CreditBalanceStatus,
    example: CreditBalanceStatus.ACTIVE,
  })
  status: CreditBalanceStatus;

  @ApiProperty({
    description: 'When the credits expire, if applicable',
    example: '2024-01-01T12:00:00Z',
    required: false,
  })
  expiresAt?: Date;

  @ApiProperty({
    description: 'Recent credit usage',
    type: [CreditUsageDto],
  })
  recentUsage: CreditUsageDto[];
}

export class CheckCreditsRequestDto {
  @ApiProperty({ description: 'Amount of credits to check', example: 100 })
  amount: number;
}

export class CheckCreditsResponseDto {
  @ApiProperty({
    description: 'Whether the user has sufficient credits',
    example: true,
  })
  hasSufficientCredits: boolean;
}

export class DeductCreditsRequestDto {
  @ApiProperty({ description: 'Amount of credits to deduct', example: 100 })
  amount: number;

  @ApiProperty({
    description: 'Type of credit usage',
    enum: CreditUsageType,
    example: CreditUsageType.API_CALL,
  })
  type: CreditUsageType;

  @ApiProperty({
    description: 'Additional metadata about the credit usage',
    example: { apiName: 'openai', modelName: 'gpt-4' },
    required: false,
  })
  metadata?: Record<string, any>;
}

export class AddCreditsRequestDto {
  @ApiProperty({ description: 'Amount of credits to add', example: 100 })
  amount: number;

  @ApiProperty({
    description: 'Reason for adding credits',
    example: 'Monthly subscription',
  })
  reason: string;

  @ApiProperty({
    description: 'ID of user who is adjusting the credits',
    example: 'admin-123',
  })
  adjustedBy: string;

  @ApiProperty({
    description: 'Additional metadata about the credit addition',
    example: { subscriptionId: 'sub-123' },
    required: false,
  })
  metadata?: Record<string, any>;
}
