import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { CreditService } from './credit.service';
import { CreditBalance } from '../../entities/credit/types';
import { AuthGuard } from '../auth/auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import {
  AddCreditsRequestDto,
  CheckCreditsRequestDto,
  CheckCreditsResponseDto,
  CreditBalanceDto,
  DeductCreditsRequestDto,
} from '../../entities/credit/dto';
import {
  GenerateApiKeyRequestDto,
  GenerateApiKeyResponseDto,
} from '../../entities/credit/api-key.dto';

@ApiTags('internal/credits')
@ApiBearerAuth()
@Controller('internal/credits')
export class CreditController {
  constructor(private readonly creditService: CreditService) { }

  // ============ BALANCE OPERATIONS ============

  @Get(':userId/balance')
  @ApiOperation({ summary: 'Get current balance (wallet + credit system integrated)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Current balance',
    schema: {
      type: 'object',
      properties: {
        balance: { type: 'number' },
        lastUpdated: { type: 'string', format: 'date-time' },
        status: { type: 'string', description: 'Wallet status', default: 'ACTIVE' }
      }
    }
  })
  async getCurrentBalance(@Param('userId') userId: string) {
    const balance = await this.creditService.getCurrentBalance(userId);
    return { 
      balance, 
      lastUpdated: new Date(),
      status: 'ACTIVE' // Default status for active wallets
    };
  }

  @Post(':userId/check')
  @ApiOperation({ summary: 'Check if user has sufficient credits' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({ type: CheckCreditsRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Returns whether user has sufficient credits',
    type: CheckCreditsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid amount' })
  async checkCredits(
    @Param('userId') userId: string,
    @Body('amount') amount: number,
  ): Promise<{ hasSufficientCredits: boolean }> {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Invalid amount');
    }

    const hasSufficientCredits = await this.creditService.checkCredits(
      userId,
      amount,
    );

    return { hasSufficientCredits };
  }

  // ============ CREDIT OPERATIONS ============

  @Post(':userId/add')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Add credits to user (admin/system use)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({ type: AddCreditsRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Credits added successfully',
    schema: {
      type: 'object',
      properties: {
        balance: { type: 'number' },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async addCredits(
    @Param('userId') userId: string,
    @Body() body: AddCreditsRequestDto,
  ): Promise<{ balance: number; message: string }> {
    if (!body.amount || body.amount <= 0) {
      throw new BadRequestException('Invalid amount');
    }

    if (!body.reason) {
      throw new BadRequestException('Reason is required');
    }

    if (!body.adjustedBy) {
      throw new BadRequestException('AdjustedBy is required');
    }

    const newBalance = await this.creditService.addCredits(
      userId,
      body.amount,
      body.reason,
      body.adjustedBy,
      body.metadata,
    );

    return {
      balance: newBalance,
      message: `Successfully added ${body.amount} credits`
    };
  }

  @Post(':userId/deduct')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Deduct credits from user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({ type: DeductCreditsRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Credits deducted successfully',
    schema: {
      type: 'object',
      properties: {
        balance: { type: 'number' },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async deductCredits(
    @Param('userId') userId: string,
    @Body() body: DeductCreditsRequestDto,
  ): Promise<{ balance: number; message: string }> {
    if (!body.amount || body.amount <= 0) {
      throw new BadRequestException('Invalid amount');
    }

    const newBalance = await this.creditService.deductCredits(
      userId,
      body.amount,
      body.type,
      body.metadata,
    );

    return {
      balance: newBalance,
      message: `Successfully deducted ${body.amount} credits`
    };
  }

  // ============ PURCHASE OPERATIONS ============

  @Post(':userId/purchase')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Purchase credits via Razorpay' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        creditAmount: { type: 'number', description: 'Number of credits to purchase' },
        amountInRupees: { type: 'number', description: 'Amount in rupees' }
      },
      required: ['creditAmount', 'amountInRupees']
    }
  })
  @ApiResponse({ status: 200, description: 'Razorpay order created successfully' })
  async purchaseCredits(
    @Param('userId') userId: string,
    @Body() body: { creditAmount: number; amountInRupees: number }
  ) {
    if (!body.creditAmount || body.creditAmount <= 0) {
      throw new BadRequestException('Invalid credit amount');
    }

    if (!body.amountInRupees || body.amountInRupees <= 0) {
      throw new BadRequestException('Invalid amount in rupees');
    }

    return this.creditService.purchaseCredits(
      userId,
      body.creditAmount,
      body.amountInRupees
    );
  }

  @Post('confirm-payment')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Confirm Razorpay payment and add credits' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        razorpay_payment_id: { type: 'string' },
        razorpay_order_id: { type: 'string' },
        razorpay_signature: { type: 'string' }
      },
      required: ['razorpay_payment_id', 'razorpay_order_id', 'razorpay_signature']
    }
  })
  @ApiResponse({ status: 200, description: 'Payment confirmed and credits added' })
  async confirmPayment(
    @Body() body: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }
  ) {
    return this.creditService.confirmPayment(body);
  }

  // ============ API KEY OPERATIONS ============

  @Post(':userId/generate-api-key')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Generate API key and deduct credits' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({ type: GenerateApiKeyRequestDto })
  @ApiResponse({
    status: 200,
    description: 'API key generated successfully',
    type: GenerateApiKeyResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request or insufficient credits' })
  async generateApiKey(
    @Param('userId') userId: string,
    @Body() body: GenerateApiKeyRequestDto,
  ): Promise<GenerateApiKeyResponseDto> {
    if (!body.creditCost || body.creditCost <= 0) {
      throw new BadRequestException('Invalid credit cost');
    }

    return this.creditService.generateApiKeyWithCreditDeduction(
      userId,
      body.creditCost,
      body.keyName,
      body.apiId,
      body.projectId,
    );
  }

  // ============ DEBUG OPERATIONS ============

  @Get(':userId/debug')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Debug balance information for troubleshooting' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Debug information about user balances'
  })
  async debugBalance(@Param('userId') userId: string) {
    try {
      const result = await this.creditService.debugBalance(userId);
      return result;
    } catch (error) {
      return {
        error: error.message,
        userId,
        timestamp: new Date()
      };
    }
  }
}