import { db } from '../db';
import { pricingModels } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { CreatePricingModelData, UpdatePricingModelData } from '../types';

export class PricingModelRepository {
  async create(data: CreatePricingModelData) {
    const [model] = await db.insert(pricingModels).values({
      name: data.name,
      type: data.type,
      baseCost: data.baseCost?.toString() || '0',
      costPerKbRequest: data.costPerKbRequest?.toString() || '0',
      costPerKbResponse: data.costPerKbResponse?.toString() || '0',
      costPerMinute: data.costPerMinute?.toString() || '0',
      tiers: data.tiers as any,
    }).returning();
    return model;
  }

  async findByUid(uid: string) {
    const [model] = await db.select()
      .from(pricingModels)
      .where(eq(pricingModels.uid, uid));
    return model || null;
  }

  async findById(id: number) {
    const [model] = await db.select()
      .from(pricingModels)
      .where(eq(pricingModels.id, id));
    return model || null;
  }

  async findAll(activeOnly: boolean = true) {
    let query = db.select()
      .from(pricingModels)
      .orderBy(desc(pricingModels.createdAt));

    if (activeOnly) {
      query = query.where(eq(pricingModels.isActive, true));
    }

    return await query;
  }

  async update(id: number, data: UpdatePricingModelData) {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.baseCost !== undefined) updateData.baseCost = data.baseCost.toString();
    if (data.costPerKbRequest !== undefined) updateData.costPerKbRequest = data.costPerKbRequest.toString();
    if (data.costPerKbResponse !== undefined) updateData.costPerKbResponse = data.costPerKbResponse.toString();
    if (data.costPerMinute !== undefined) updateData.costPerMinute = data.costPerMinute.toString();
    if (data.tiers !== undefined) updateData.tiers = data.tiers as any;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [updated] = await db.update(pricingModels)
      .set(updateData)
      .where(eq(pricingModels.id, id))
      .returning();

    return updated;
  }

  async delete(id: number) {
    // Soft delete
    const [deleted] = await db.update(pricingModels)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(pricingModels.id, id))
      .returning();

    return deleted;
  }
}

export const pricingModelRepository = new PricingModelRepository();
