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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';

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

@ApiTags('wallet')
@Controller('internal/wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new wallet for a user' })
  @ApiBody({ type: CreateWalletDto })
  @ApiResponse({
    status: 201,
    description: 'Wallet created successfully',
    schema: {
      type: 'object',
      properties: {
        wallet_id: { type: 'string' },
        credit_balance: { type: 'number' },
        status: { type: 'string' },
        created_at: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Wallet already exists' })
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
  @ApiOperation({ summary: 'Get the balance for a wallet' })
  @ApiParam({ name: 'walletId', description: 'The wallet ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the wallet balance',
    type: WalletBalanceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
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
  @ApiOperation({ summary: 'Add credits to a wallet' })
  @ApiParam({ name: 'walletId', description: 'The wallet ID' })
  @ApiBody({ type: AddCreditsDto })
  @ApiResponse({
    status: 200,
    description: 'Credits added successfully',
    schema: {
      type: 'object',
      properties: {
        transaction_id: { type: 'string' },
        previous_balance: { type: 'number' },
        added_amount: { type: 'number' },
        current_balance: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
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
  @ApiOperation({ summary: 'Deduct credits from a wallet' })
  @ApiParam({ name: 'walletId', description: 'The wallet ID' })
  @ApiBody({ type: DeductCreditsDto })
  @ApiResponse({
    status: 200,
    description: 'Credits deducted successfully',
    schema: {
      type: 'object',
      properties: {
        transaction_id: { type: 'string' },
        previous_balance: { type: 'number' },
        deducted_amount: { type: 'number' },
        current_balance: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request or insufficient credits',
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
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
  @ApiOperation({ summary: 'Get transaction history for a wallet' })
  @ApiParam({ name: 'walletId', description: 'The wallet ID' })
  @ApiQuery({
    name: 'limit',
    description: 'Number of transactions to return',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Offset for pagination',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'type',
    description: 'Filter by transaction type (credit or debit)',
    required: false,
    enum: ['credit', 'debit'],
  })
  @ApiResponse({
    status: 200,
    description: 'Returns transaction history',
    schema: {
      type: 'object',
      properties: {
        transactions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              transaction_id: { type: 'string' },
              type: { type: 'string', enum: ['CREDIT', 'DEBIT'] },
              amount: { type: 'number' },
              description: { type: 'string' },
              reference_id: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number' },
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
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
  @ApiOperation({ summary: 'Check if a wallet has sufficient credits' })
  @ApiQuery({
    name: 'api_key',
    description: 'API key associated with the wallet',
    required: true,
  })
  @ApiQuery({
    name: 'amount',
    description: 'Amount of credits to check',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns credit check result',
    schema: {
      type: 'object',
      properties: {
        has_sufficient_credits: { type: 'boolean' },
        current_balance: { type: 'number' },
        required_amount: { type: 'number' },
        remaining_if_used: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
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
