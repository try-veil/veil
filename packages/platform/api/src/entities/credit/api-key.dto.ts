import { ApiProperty } from '@nestjs/swagger';

export class GenerateApiKeyRequestDto {
  @ApiProperty({ 
    description: 'Cost in credits to generate the API key', 
    example: 100 
  })
  creditCost: number;

  @ApiProperty({ 
    description: 'Name for the API key', 
    example: 'My API Key',
    required: false 
  })
  keyName?: string;

  @ApiProperty({ 
    description: 'API ID to associate with the key', 
    example: 'api-123',
    required: false 
  })
  apiId?: string;

  @ApiProperty({ 
    description: 'Project ID to associate with the key', 
    example: 1,
    required: false 
  })
  projectId?: number;
}

export class GenerateApiKeyResponseDto {
  @ApiProperty({ 
    description: 'Generated API key', 
    example: 'veil_1234567890abcdef' 
  })
  apiKey: string;

  @ApiProperty({ 
    description: 'Remaining credits after deduction', 
    example: 900 
  })
  remainingCredits: number;

  @ApiProperty({ 
    description: 'Subscription ID for the generated key', 
    example: 'sub-123' 
  })
  subscriptionId: string;
}

export class PurchaseCreditsRequestDto {
  @ApiProperty({ 
    description: 'Amount of credits to purchase', 
    example: 1000 
  })
  amount: number;

  @ApiProperty({ 
    description: 'Payment method type', 
    example: 'CARD',
    enum: ['CARD', 'CREDITS', 'ACH', 'OFFLINE']
  })
  paymentMethodType: string;

  @ApiProperty({ 
    description: 'Payment method ID', 
    example: 'pm_1234567890',
    required: false 
  })
  paymentMethodId?: string;

  @ApiProperty({ 
    description: 'Currency for the purchase', 
    example: 'USD',
    required: false 
  })
  currency?: string;
}

export class PurchaseCreditsResponseDto {
  @ApiProperty({ 
    description: 'Transaction ID', 
    example: 'txn_1234567890' 
  })
  transactionId: string;

  @ApiProperty({ 
    description: 'Credits added to account', 
    example: 1000 
  })
  creditsAdded: number;

  @ApiProperty({ 
    description: 'New credit balance', 
    example: 1900 
  })
  newBalance: number;

  @ApiProperty({ 
    description: 'Payment status', 
    example: 'SUCCEEDED',
    enum: ['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED']
  })
  paymentStatus: string;
}