import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletTransactionType } from '../../entities/billing/types';

// DTOs for request/response
class CreateWalletDto {
  userId: string;
  initialCredits?: number;
}

class AddCreditsDto {
  amount: number;
  description?: string;
  referenceId?: string;
}

class DeductCreditsDto {
  amount: number;
  description?: string;
  referenceId?: string;
}

class WalletBalanceResponseDto {
  walletId: string;
  creditBalance: number;
  lastUpdated: Date;
}

@Controller('internal/wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  async createWallet(@Body() createWalletDto: CreateWalletDto) {
    try {
      const wallet = await this.walletService.createWallet(
        createWalletDto.userId,
        createWalletDto.initialCredits || 0,
      );

      return {
        wallet_id: wallet.id,
        credit_balance: wallet.creditBalance,
        status: 'active',
        created_at: wallet.createdAt,
      };
    } catch (error) {
      if (error.message.includes('already exists')) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  @Get('balance/:walletId')
  async getBalance(
    @Param('walletId') walletId: string,
  ): Promise<WalletBalanceResponseDto> {
    try {
      const wallet = await this.walletService.getWallet(walletId);

      return {
        walletId: wallet.id,
        creditBalance: wallet.creditBalance,
        lastUpdated: wallet.updatedAt,
      };
    } catch (error) {
      throw new NotFoundException(`Wallet with ID ${walletId} not found`);
    }
  }

  @Post(':walletId/credits/add')
  async addCredits(
    @Param('walletId') walletId: string,
    @Body() addCreditsDto: AddCreditsDto,
  ) {
    try {
      const transaction = await this.walletService.addCredits(
        walletId,
        addCreditsDto.amount,
        undefined,
        undefined,
        addCreditsDto.referenceId,
        addCreditsDto.description,
      );

      const wallet = await this.walletService.getWallet(walletId);

      return {
        transaction_id: transaction.id,
        previous_balance: wallet.creditBalance - addCreditsDto.amount,
        added_amount: addCreditsDto.amount,
        current_balance: wallet.creditBalance,
      };
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  @Post(':walletId/credits/deduct')
  async deductCredits(
    @Param('walletId') walletId: string,
    @Body() deductCreditsDto: DeductCreditsDto,
  ) {
    try {
      // Get current balance before deduction
      const wallet = await this.walletService.getWallet(walletId);
      const previousBalance = wallet.creditBalance;

      const transaction = await this.walletService.deductCredits(
        walletId,
        deductCreditsDto.amount,
        undefined,
        undefined,
        deductCreditsDto.referenceId,
        deductCreditsDto.description,
      );

      // Get updated wallet
      const updatedWallet = await this.walletService.getWallet(walletId);

      return {
        transaction_id: transaction.id,
        previous_balance: previousBalance,
        deducted_amount: deductCreditsDto.amount,
        current_balance: updatedWallet.creditBalance,
      };
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new NotFoundException(error.message);
      }
      if (error.message.includes('Insufficient')) {
        throw new BadRequestException('Insufficient credits');
      }
      throw new BadRequestException(error.message);
    }
  }

  @Get(':walletId/transactions')
  async getTransactions(
    @Param('walletId') walletId: string,
    @Query('limit') limit: number = 10,
    @Query('offset') offset: number = 0,
    @Query('type') type?: string,
  ) {
    try {
      let transactionType: WalletTransactionType | undefined;
      if (type) {
        if (type === 'credit') {
          transactionType = WalletTransactionType.CREDIT;
        } else if (type === 'debit') {
          transactionType = WalletTransactionType.DEBIT;
        }
      }

      const transactions = await this.walletService.getTransactions(
        walletId,
        limit,
        offset,
        transactionType,
      );

      return {
        transactions: transactions.map((t) => ({
          transaction_id: t.id,
          type: t.type,
          amount: t.amount,
          description: t.description,
          reference_id: t.referenceId,
          timestamp: t.createdAt,
        })),
        total: transactions.length,
        limit,
        offset,
      };
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  @Get('check')
  async checkCredits(
    @Query('api_key') apiKey: string,
    @Query('amount') amount: number = 1,
  ) {
    if (!apiKey) {
      throw new BadRequestException('API key is required');
    }

    const wallet = await this.walletService.findWalletByApiKey(apiKey);
    if (!wallet) {
      throw new UnauthorizedException('Invalid API key');
    }

    const hasSufficientCredits = await this.walletService.hasSufficientCredits(
      wallet.id,
      amount,
    );

    return {
      has_sufficient_credits: hasSufficientCredits,
      current_balance: wallet.creditBalance,
      required_amount: amount,
      remaining_if_used: hasSufficientCredits
        ? wallet.creditBalance - amount
        : 0,
    };
  }
}
