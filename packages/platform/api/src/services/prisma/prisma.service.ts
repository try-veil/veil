import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly isProduction: boolean;

  constructor(private configService: ConfigService) {
    super();
    this.isProduction = configService.get('NODE_ENV') === 'production';
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to the database');
    } catch (error) {
      this.logger.error('Failed to connect to the database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Successfully disconnected from the database');
    } catch (error) {
      this.logger.error('Error disconnecting from the database', error);
      throw error;
    }
  }

  /**
   * Cleans up all records in the database.
   * This is intended for testing purposes only and will fail in production.
   */
  async cleanDatabase() {
    if (this.isProduction) {
      const error = new Error(
        'Database cleanup is not allowed in production environment',
      );
      this.logger.error(error.message);
      throw error;
    }

    const tables = [
      'HubListing',
      'PlanConfig',
      'WalletTransaction',
      'Wallet',
      'PaymentAttempt',
      'Payment',
      'SubscriptionPause',
      'Subscription',
      'BillingPlanVersion',
      'BillingPlan',
      'BillingItem',
      'BillingLimit',
      'EnabledBillingFeature',
      'BillingFeature',
      'User',
    ];

    this.logger.warn('Cleaning database - all data will be deleted');

    try {
      for (const table of tables) {
        await this.$executeRawUnsafe(`DELETE FROM "${table}";`);
      }
      this.logger.log('Database cleaned successfully');
    } catch (error) {
      this.logger.error('Error cleaning database', error);
      throw error;
    }
  }
}
