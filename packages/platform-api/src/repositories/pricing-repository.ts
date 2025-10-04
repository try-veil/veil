import { db } from '../db';
import { pricingModels, pricingTiers, promotions, billingPeriods, invoices, subscriptionPricingHistory } from '../db/schema';
import { eq, and, gte, lte, isNull, or, desc, sql } from 'drizzle-orm';
import { PricingModelConfig, PromotionConfig, BillingPeriod, Invoice } from '../types/pricing-types';

export class PricingRepository {
  /**
   * Create a new pricing model
   */
  async createPricingModel(data: Omit<typeof pricingModels.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>) {
    const [model] = await db.insert(pricingModels).values(data).returning();
    return model;
  }

  /**
   * Get pricing model by ID
   */
  async findPricingModelById(id: number) {
    const [model] = await db.select()
      .from(pricingModels)
      .where(eq(pricingModels.id, id))
      .limit(1);
    return model;
  }

  /**
   * Get pricing model by UID
   */
  async findPricingModelByUid(uid: string) {
    const [model] = await db.select()
      .from(pricingModels)
      .where(eq(pricingModels.uid, uid))
      .limit(1);
    return model;
  }

  /**
   * Get all active pricing models
   */
  async findActivePricingModels() {
    return await db.select()
      .from(pricingModels)
      .where(eq(pricingModels.isActive, true));
  }

  /**
   * Get pricing models by type
   */
  async findPricingModelsByType(type: string) {
    return await db.select()
      .from(pricingModels)
      .where(and(
        eq(pricingModels.type, type),
        eq(pricingModels.isActive, true)
      ));
  }

  /**
   * Update pricing model
   */
  async updatePricingModel(id: number, data: Partial<typeof pricingModels.$inferInsert>) {
    const [updated] = await db.update(pricingModels)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(pricingModels.id, id))
      .returning();
    return updated;
  }

  /**
   * Delete pricing model (soft delete by setting inactive)
   */
  async deactivatePricingModel(id: number) {
    const [updated] = await db.update(pricingModels)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(pricingModels.id, id))
      .returning();
    return updated;
  }

  /**
   * Get pricing tiers for a model
   */
  async findTiersByPricingModel(pricingModelId: number) {
    return await db.select()
      .from(pricingTiers)
      .where(eq(pricingTiers.pricingModelId, pricingModelId))
      .orderBy(pricingTiers.tierOrder);
  }

  /**
   * Create pricing tier
   */
  async createPricingTier(data: Omit<typeof pricingTiers.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>) {
    const [tier] = await db.insert(pricingTiers).values(data).returning();
    return tier;
  }

  /**
   * Update pricing tier
   */
  async updatePricingTier(id: number, data: Partial<typeof pricingTiers.$inferInsert>) {
    const [updated] = await db.update(pricingTiers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(pricingTiers.id, id))
      .returning();
    return updated;
  }

  /**
   * Delete pricing tier
   */
  async deletePricingTier(id: number) {
    await db.delete(pricingTiers).where(eq(pricingTiers.id, id));
  }

  /**
   * Get promotion by ID
   */
  async findPromotionById(id: number) {
    const [promotion] = await db.select()
      .from(promotions)
      .where(eq(promotions.id, id))
      .limit(1);
    return promotion;
  }

  /**
   * Get promotion by code
   */
  async findPromotionByCode(code: string) {
    const [promotion] = await db.select()
      .from(promotions)
      .where(eq(promotions.code, code))
      .limit(1);
    return promotion;
  }

  /**
   * Get all active promotions
   */
  async findActivePromotions() {
    const now = new Date();
    return await db.select()
      .from(promotions)
      .where(and(
        eq(promotions.isActive, true),
        lte(promotions.validFrom, now),
        or(
          isNull(promotions.validUntil),
          gte(promotions.validUntil, now)
        )
      ))
      .orderBy(desc(promotions.priority));
  }

  /**
   * Create promotion
   */
  async createPromotion(data: Omit<typeof promotions.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>) {
    const [promotion] = await db.insert(promotions).values(data).returning();
    return promotion;
  }

  /**
   * Update promotion
   */
  async updatePromotion(id: number, data: Partial<typeof promotions.$inferInsert>) {
    const [updated] = await db.update(promotions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(promotions.id, id))
      .returning();
    return updated;
  }

  /**
   * Increment promotion usage count
   */
  async incrementPromotionUsage(id: number) {
    const [updated] = await db.update(promotions)
      .set({
        currentUses: sql`${promotions.currentUses} + 1`,
        updatedAt: new Date()
      })
      .where(eq(promotions.id, id))
      .returning();
    return updated;
  }

  /**
   * Deactivate promotion
   */
  async deactivatePromotion(id: number) {
    const [updated] = await db.update(promotions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(promotions.id, id))
      .returning();
    return updated;
  }

  /**
   * Create billing period
   */
  async createBillingPeriod(data: Omit<typeof billingPeriods.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>) {
    const [period] = await db.insert(billingPeriods).values(data).returning();
    return period;
  }

  /**
   * Get current billing period for subscription
   */
  async findCurrentBillingPeriod(subscriptionId: number) {
    const now = new Date();
    const [period] = await db.select()
      .from(billingPeriods)
      .where(and(
        eq(billingPeriods.subscriptionId, subscriptionId),
        eq(billingPeriods.status, 'active'),
        lte(billingPeriods.startDate, now),
        gte(billingPeriods.endDate, now)
      ))
      .limit(1);
    return period;
  }

  /**
   * Get billing periods for subscription
   */
  async findBillingPeriodsBySubscription(subscriptionId: number, limit: number = 12) {
    return await db.select()
      .from(billingPeriods)
      .where(eq(billingPeriods.subscriptionId, subscriptionId))
      .orderBy(desc(billingPeriods.startDate))
      .limit(limit);
  }

  /**
   * Update billing period
   */
  async updateBillingPeriod(id: number, data: Partial<typeof billingPeriods.$inferInsert>) {
    const [updated] = await db.update(billingPeriods)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(billingPeriods.id, id))
      .returning();
    return updated;
  }

  /**
   * Close billing period
   */
  async closeBillingPeriod(id: number, calculatedAmount: number, usageSnapshot: any) {
    const [updated] = await db.update(billingPeriods)
      .set({
        status: 'closed',
        calculatedAmount: calculatedAmount.toString(),
        usageSnapshot: JSON.stringify(usageSnapshot),
        updatedAt: new Date()
      })
      .where(eq(billingPeriods.id, id))
      .returning();
    return updated;
  }

  /**
   * Create invoice
   */
  async createInvoice(data: Omit<typeof invoices.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>) {
    const [invoice] = await db.insert(invoices).values(data).returning();
    return invoice;
  }

  /**
   * Get invoice by ID
   */
  async findInvoiceById(id: number) {
    const [invoice] = await db.select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);
    return invoice;
  }

  /**
   * Get invoice by number
   */
  async findInvoiceByNumber(invoiceNumber: string) {
    const [invoice] = await db.select()
      .from(invoices)
      .where(eq(invoices.invoiceNumber, invoiceNumber))
      .limit(1);
    return invoice;
  }

  /**
   * Get invoices for user
   */
  async findInvoicesByUser(userId: number, limit: number = 20) {
    return await db.select()
      .from(invoices)
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.issueDate))
      .limit(limit);
  }

  /**
   * Get invoices for subscription
   */
  async findInvoicesBySubscription(subscriptionId: number) {
    return await db.select()
      .from(invoices)
      .where(eq(invoices.subscriptionId, subscriptionId))
      .orderBy(desc(invoices.issueDate));
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(id: number, status: string, paidDate?: Date) {
    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    if (paidDate) {
      updateData.paidDate = paidDate;
    }

    const [updated] = await db.update(invoices)
      .set(updateData)
      .where(eq(invoices.id, id))
      .returning();
    return updated;
  }

  /**
   * Get overdue invoices
   */
  async findOverdueInvoices() {
    const now = new Date();
    return await db.select()
      .from(invoices)
      .where(and(
        eq(invoices.status, 'pending'),
        lte(invoices.dueDate, now)
      ));
  }

  /**
   * Record pricing change in history
   */
  async createPricingHistory(data: Omit<typeof subscriptionPricingHistory.$inferInsert, 'id' | 'createdAt'>) {
    const [history] = await db.insert(subscriptionPricingHistory).values(data).returning();
    return history;
  }

  /**
   * Get pricing history for subscription
   */
  async findPricingHistoryBySubscription(subscriptionId: number) {
    return await db.select()
      .from(subscriptionPricingHistory)
      .where(eq(subscriptionPricingHistory.subscriptionId, subscriptionId))
      .orderBy(desc(subscriptionPricingHistory.effectiveDate));
  }

  /**
   * Generate unique invoice number
   */
  async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Get count of invoices this month
    const startOfMonth = new Date(year, now.getMonth(), 1);
    const endOfMonth = new Date(year, now.getMonth() + 1, 0);

    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(and(
        gte(invoices.createdAt, startOfMonth),
        lte(invoices.createdAt, endOfMonth)
      ));

    const sequence = String((result?.count || 0) + 1).padStart(6, '0');
    return `INV-${year}${month}-${sequence}`;
  }

  /**
   * Get revenue statistics
   */
  async getRevenueStats(startDate: Date, endDate: Date) {
    const [stats] = await db.select({
      totalRevenue: sql<number>`SUM(CAST(${invoices.totalAmount} AS DECIMAL))`,
      paidInvoices: sql<number>`COUNT(*) FILTER (WHERE ${invoices.status} = 'paid')`,
      pendingRevenue: sql<number>`SUM(CAST(${invoices.totalAmount} AS DECIMAL)) FILTER (WHERE ${invoices.status} = 'pending')`,
      avgInvoiceAmount: sql<number>`AVG(CAST(${invoices.totalAmount} AS DECIMAL))`,
    })
    .from(invoices)
    .where(and(
      gte(invoices.issueDate, startDate),
      lte(invoices.issueDate, endDate)
    ));

    return stats;
  }
}

// Export singleton instance
export const pricingRepository = new PricingRepository();