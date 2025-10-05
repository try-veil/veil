import { db } from '../db';
import { proxyApis } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { CreateProxyApiData, UpdateProxyApiData } from '../types';

export class ProxyApiRepository {
  async create(data: CreateProxyApiData) {
    const [api] = await db.insert(proxyApis).values({
      slug: data.slug,
      name: data.name,
      description: data.description,
      upstreamUrl: data.upstreamUrl,
      defaultPricingModelId: data.defaultPricingModelId,
      defaultHeaders: data.defaultHeaders,
      stripHeaders: data.stripHeaders,
      timeoutSeconds: data.timeoutSeconds || 30,
      rateLimitPerMinute: data.rateLimitPerMinute,
    }).returning();
    return api;
  }

  async findBySlug(slug: string) {
    const [api] = await db.select()
      .from(proxyApis)
      .where(eq(proxyApis.slug, slug));
    return api || null;
  }

  async findByUid(uid: string) {
    const [api] = await db.select()
      .from(proxyApis)
      .where(eq(proxyApis.uid, uid));
    return api || null;
  }

  async findById(id: number) {
    const [api] = await db.select()
      .from(proxyApis)
      .where(eq(proxyApis.id, id));
    return api || null;
  }

  async findAll(activeOnly: boolean = false) {
    let query = db.select()
      .from(proxyApis)
      .orderBy(desc(proxyApis.createdAt));

    if (activeOnly) {
      query = query.where(eq(proxyApis.isActive, true));
    }

    return await query;
  }

  async update(id: number, data: UpdateProxyApiData) {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.upstreamUrl !== undefined) updateData.upstreamUrl = data.upstreamUrl;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.defaultPricingModelId !== undefined) updateData.defaultPricingModelId = data.defaultPricingModelId;
    if (data.defaultHeaders !== undefined) updateData.defaultHeaders = data.defaultHeaders;
    if (data.stripHeaders !== undefined) updateData.stripHeaders = data.stripHeaders;
    if (data.timeoutSeconds !== undefined) updateData.timeoutSeconds = data.timeoutSeconds;
    if (data.rateLimitPerMinute !== undefined) updateData.rateLimitPerMinute = data.rateLimitPerMinute;

    const [updated] = await db.update(proxyApis)
      .set(updateData)
      .where(eq(proxyApis.id, id))
      .returning();

    return updated;
  }

  async delete(id: number) {
    // Soft delete by marking as inactive
    const [deleted] = await db.update(proxyApis)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(proxyApis.id, id))
      .returning();

    return deleted;
  }
}

export const proxyApiRepository = new ProxyApiRepository();
