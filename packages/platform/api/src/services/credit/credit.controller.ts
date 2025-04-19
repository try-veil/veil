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
  CreditUsageType,
} from '../../entities/credit/types';
import { AuthGuard } from '../auth/auth.guard';

@Controller('credits')
@UseGuards(AuthGuard)
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  @Get(':userId')
  async getCreditBalance(
    @Param('userId') userId: string,
  ): Promise<CreditBalanceResponse> {
    return this.creditService.getCreditBalance(userId);
  }

  @Post(':userId/check')
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
  async deductCredits(
    @Param('userId') userId: string,
    @Body()
    body: {
      amount: number;
      type: CreditUsageType;
      metadata?: Record<string, any>;
    },
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
  async addCredits(
    @Param('userId') userId: string,
    @Body()
    body: {
      amount: number;
      reason: string;
      adjustedBy: string;
      metadata?: Record<string, any>;
    },
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
}
