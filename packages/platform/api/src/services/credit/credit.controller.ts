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
import {
  CreditBalance,
  CreditBalanceResponse,
} from '../../entities/credit/types';
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
  CreditBalanceResponseDto,
  DeductCreditsRequestDto,
} from '../../entities/credit/dto';
import {
  GenerateApiKeyRequestDto,
  GenerateApiKeyResponseDto,
  PurchaseCreditsRequestDto,
  PurchaseCreditsResponseDto,
} from '../../entities/credit/api-key.dto';

@ApiTags('credits')
@ApiBearerAuth()
@Controller('credits')
@UseGuards(AuthGuard)
export class CreditController {
  constructor(private readonly creditService: CreditService) { }

  @Get(':userId')
  @ApiOperation({ summary: 'Get credit balance for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the credit balance',
    type: CreditBalanceResponseDto,
  })
  async getCreditBalance(
    @Param('userId') userId: string,
  ): Promise<CreditBalanceResponse> {
    return this.creditService.getCreditBalance(userId);
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

  @Post(':userId/deduct')
  @ApiOperation({ summary: 'Deduct credits from user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({ type: DeductCreditsRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Credits deducted successfully',
    type: CreditBalanceDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async deductCredits(
    @Param('userId') userId: string,
    @Body()
    body: DeductCreditsRequestDto,
  ): Promise<CreditBalance> {
    if (!body.amount || body.amount <= 0) {
      throw new BadRequestException('Invalid amount');
    }

    return this.creditService.deductCredits(
      userId,
      body.amount,
      body.type,
      body.metadata,
    );
  }

  @Post(':userId/add')
  @ApiOperation({ summary: 'Add credits to user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({ type: AddCreditsRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Credits added successfully',
    type: CreditBalanceDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async addCredits(
    @Param('userId') userId: string,
    @Body()
    body: AddCreditsRequestDto,
  ): Promise<CreditBalance> {
    if (!body.amount || body.amount <= 0) {
      throw new BadRequestException('Invalid amount');
    }

    if (!body.reason) {
      throw new BadRequestException('Reason is required');
    }

    if (!body.adjustedBy) {
      throw new BadRequestException('AdjustedBy is required');
    }

    return this.creditService.addCredits(
      userId,
      body.amount,
      body.reason,
      body.adjustedBy,
      body.metadata,
    );
  }

  @Post(':userId/generate-api-key')
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

  @Post(':userId/purchase')
  @ApiOperation({ summary: 'Purchase credits' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({ type: PurchaseCreditsRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Credits purchased successfully',
    type: PurchaseCreditsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async purchaseCredits(
    @Param('userId') userId: string,
    @Body() body: PurchaseCreditsRequestDto,
  ): Promise<PurchaseCreditsResponseDto> {
    if (!body.amount || body.amount <= 0) {
      throw new BadRequestException('Invalid amount');
    }

    if (!body.paymentMethodType) {
      throw new BadRequestException('Payment method type is required');
    }

    return this.creditService.purchaseCredits(userId, body.amount, {
      paymentMethodType: body.paymentMethodType,
      paymentMethodId: body.paymentMethodId,
      currency: body.currency,
    });
  }
}
