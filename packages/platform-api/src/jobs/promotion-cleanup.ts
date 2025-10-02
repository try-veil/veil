import { PricingRepository } from '../repositories/pricing-repository';

/**
 * Background job to cleanup expired promotions
 *
 * This job should run daily to:
 * 1. Find expired promotions (validUntil date passed)
 * 2. Deactivate expired promotions
 * 3. Find promotions that reached max usage
 * 4. Archive old promotions
 */

export interface PromotionCleanupResult {
  expiredDeactivated: number;
  maxUsageReached: number;
  archived: number;
  errors: Array<{
    promotionId: number;
    error: string;
  }>;
}

export class PromotionCleanupJob {
  private pricingRepository: PricingRepository;
  private readonly ARCHIVE_AFTER_DAYS = 90; // Archive promotions 90 days after expiry

  constructor() {
    this.pricingRepository = new PricingRepository();
  }

  /**
   * Main job execution method
   */
  async execute(): Promise<PromotionCleanupResult> {
    const startTime = Date.now();
    console.log('[PromotionCleanup] Starting job execution...');

    const result: PromotionCleanupResult = {
      expiredDeactivated: 0,
      maxUsageReached: 0,
      archived: 0,
      errors: []
    };

    try {
      // Deactivate expired promotions
      await this.deactivateExpiredPromotions(result);

      // Deactivate promotions that reached max usage
      await this.deactivateMaxUsagePromotions(result);

      // Archive old promotions
      await this.archiveOldPromotions(result);

      const duration = Date.now() - startTime;
      console.log(`[PromotionCleanup] Job completed in ${duration}ms`);
      console.log(`[PromotionCleanup] Results:`, result);

      return result;

    } catch (error) {
      console.error('[PromotionCleanup] Job execution failed:', error);
      throw error;
    }
  }

  /**
   * Deactivate promotions that have passed their validUntil date
   */
  private async deactivateExpiredPromotions(result: PromotionCleanupResult): Promise<void> {
    try {
      const now = new Date();

      // Find active promotions that are expired
      const expiredPromotions = await this.pricingRepository.findExpiredPromotions(now);

      console.log(`[PromotionCleanup] Found ${expiredPromotions.length} expired promotions`);

      for (const promotion of expiredPromotions) {
        try {
          // Deactivate the promotion
          await this.pricingRepository.updatePromotion(promotion.id, {
            isActive: false
          });

          result.expiredDeactivated++;
          console.log(`[PromotionCleanup] Deactivated expired promotion: ${promotion.code || promotion.name}`);

        } catch (error) {
          console.error(`[PromotionCleanup] Error deactivating promotion ${promotion.id}:`, error);
          result.errors.push({
            promotionId: promotion.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

    } catch (error) {
      console.error('[PromotionCleanup] Failed to deactivate expired promotions:', error);
      throw error;
    }
  }

  /**
   * Deactivate promotions that have reached their maximum usage
   */
  private async deactivateMaxUsagePromotions(result: PromotionCleanupResult): Promise<void> {
    try {
      // Find active promotions that have reached max uses
      const maxUsagePromotions = await this.pricingRepository.findMaxUsagePromotions();

      console.log(`[PromotionCleanup] Found ${maxUsagePromotions.length} promotions at max usage`);

      for (const promotion of maxUsagePromotions) {
        try {
          // Deactivate the promotion
          await this.pricingRepository.updatePromotion(promotion.id, {
            isActive: false
          });

          result.maxUsageReached++;
          console.log(`[PromotionCleanup] Deactivated max-usage promotion: ${promotion.code || promotion.name} (${promotion.currentUses}/${promotion.maxUses})`);

        } catch (error) {
          console.error(`[PromotionCleanup] Error deactivating max-usage promotion ${promotion.id}:`, error);
          result.errors.push({
            promotionId: promotion.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

    } catch (error) {
      console.error('[PromotionCleanup] Failed to deactivate max-usage promotions:', error);
      throw error;
    }
  }

  /**
   * Archive old inactive promotions for historical records
   * (Soft delete - keeps in database but marks as archived)
   */
  private async archiveOldPromotions(result: PromotionCleanupResult): Promise<void> {
    try {
      const archiveDate = new Date();
      archiveDate.setDate(archiveDate.getDate() - this.ARCHIVE_AFTER_DAYS);

      // Find inactive promotions older than ARCHIVE_AFTER_DAYS
      const oldPromotions = await this.pricingRepository.findInactivePromotionsBefore(archiveDate);

      console.log(`[PromotionCleanup] Found ${oldPromotions.length} old promotions to archive`);

      for (const promotion of oldPromotions) {
        try {
          // In a real system, you might move these to an archive table
          // or add an 'archived' flag to the promotions table
          // For now, we just log them

          console.log(`[PromotionCleanup] Would archive promotion: ${promotion.code || promotion.name} (inactive since ${promotion.updatedAt})`);
          result.archived++;

          // TODO: Implement actual archival logic
          // await this.pricingRepository.archivePromotion(promotion.id);

        } catch (error) {
          console.error(`[PromotionCleanup] Error archiving promotion ${promotion.id}:`, error);
          result.errors.push({
            promotionId: promotion.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

    } catch (error) {
      console.error('[PromotionCleanup] Failed to archive old promotions:', error);
      throw error;
    }
  }

  /**
   * Get statistics about promotions
   */
  async getPromotionStats(): Promise<{
    totalActive: number;
    totalExpired: number;
    expiringToday: number;
    nearingMaxUsage: number;
  }> {
    try {
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      const [
        activePromotions,
        expiredPromotions,
        expiringToday
      ] = await Promise.all([
        this.pricingRepository.findActivePromotions(),
        this.pricingRepository.findExpiredPromotions(now),
        this.pricingRepository.findPromotionsExpiringBetween(now, endOfDay)
      ]);

      // Count promotions nearing max usage (>= 90% of max uses)
      const nearingMaxUsage = activePromotions.filter(p =>
        p.maxUses && p.currentUses >= p.maxUses * 0.9
      ).length;

      return {
        totalActive: activePromotions.length,
        totalExpired: expiredPromotions.length,
        expiringToday: expiringToday.length,
        nearingMaxUsage
      };

    } catch (error) {
      console.error('[PromotionCleanup] Failed to get promotion stats:', error);
      throw error;
    }
  }

  /**
   * Dry run mode
   */
  async dryRun(): Promise<PromotionCleanupResult> {
    console.log('[PromotionCleanup] Running in DRY RUN mode...');

    const result: PromotionCleanupResult = {
      expiredDeactivated: 0,
      maxUsageReached: 0,
      archived: 0,
      errors: []
    };

    const now = new Date();
    const archiveDate = new Date();
    archiveDate.setDate(archiveDate.getDate() - this.ARCHIVE_AFTER_DAYS);

    const expiredPromotions = await this.pricingRepository.findExpiredPromotions(now);
    const maxUsagePromotions = await this.pricingRepository.findMaxUsagePromotions();
    const oldPromotions = await this.pricingRepository.findInactivePromotionsBefore(archiveDate);

    console.log(`[PromotionCleanup] Would deactivate ${expiredPromotions.length} expired promotions`);
    console.log(`[PromotionCleanup] Would deactivate ${maxUsagePromotions.length} max-usage promotions`);
    console.log(`[PromotionCleanup] Would archive ${oldPromotions.length} old promotions`);

    const stats = await this.getPromotionStats();
    console.log(`[PromotionCleanup] Current stats:`, stats);

    return result;
  }
}

// Export singleton instance
export const promotionCleanupJob = new PromotionCleanupJob();