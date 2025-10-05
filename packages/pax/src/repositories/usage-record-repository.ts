import { db } from '../db';
import { usageRecords } from '../db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { CreateUsageRecordData, UsageFilters } from '../types';

export class UsageRecordRepository {
  async create(data: CreateUsageRecordData) {
    const [record] = await db.insert(usageRecords).values(data).returning();
    return record;
  }

  async findByUid(uid: string) {
    const [record] = await db.select()
      .from(usageRecords)
      .where(eq(usageRecords.uid, uid));
    return record || null;
  }

  async findByFilters(filters: UsageFilters) {
    const conditions = [];

    if (filters.userId) {
      conditions.push(eq(usageRecords.userId, filters.userId));
    }

    if (filters.apiId) {
      conditions.push(eq(usageRecords.apiId, filters.apiId));
    }

    if (filters.fromDate) {
      conditions.push(gte(usageRecords.createdAt, filters.fromDate));
    }

    if (filters.toDate) {
      conditions.push(lte(usageRecords.createdAt, filters.toDate));
    }

    let query = db.select()
      .from(usageRecords)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(usageRecords.createdAt));

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    return await query;
  }

  async getAnalytics(filters: UsageFilters) {
    const conditions = [];

    if (filters.userId) {
      conditions.push(eq(usageRecords.userId, filters.userId));
    }

    if (filters.apiId) {
      conditions.push(eq(usageRecords.apiId, filters.apiId));
    }

    if (filters.fromDate) {
      conditions.push(gte(usageRecords.createdAt, filters.fromDate));
    }

    if (filters.toDate) {
      conditions.push(lte(usageRecords.createdAt, filters.toDate));
    }

    // Get total stats
    const [totalStats] = await db.select({
      totalRequests: sql<number>`count(*)::int`,
      totalCost: sql<string>`sum(${usageRecords.actualCost})`,
      avgCost: sql<string>`avg(${usageRecords.actualCost})`,
    })
      .from(usageRecords)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get stats by API
    const byApi = await db.select({
      apiId: usageRecords.apiId,
      requests: sql<number>`count(*)::int`,
      cost: sql<string>`sum(${usageRecords.actualCost})`,
    })
      .from(usageRecords)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(usageRecords.apiId);

    // Get stats by date
    const byDate = await db.select({
      date: sql<string>`date(${usageRecords.createdAt})`,
      requests: sql<number>`count(*)::int`,
      cost: sql<string>`sum(${usageRecords.actualCost})`,
    })
      .from(usageRecords)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(sql`date(${usageRecords.createdAt})`)
      .orderBy(sql`date(${usageRecords.createdAt})`);

    // Get top endpoints
    const topEndpoints = await db.select({
      path: usageRecords.path,
      requests: sql<number>`count(*)::int`,
      cost: sql<string>`sum(${usageRecords.actualCost})`,
    })
      .from(usageRecords)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(usageRecords.path)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    return {
      totalRequests: totalStats.totalRequests || 0,
      totalCost: parseFloat(totalStats.totalCost || '0'),
      avgCostPerRequest: parseFloat(totalStats.avgCost || '0'),
      byApi: byApi.map(a => ({
        apiId: a.apiId,
        requests: a.requests,
        cost: parseFloat(a.cost),
      })),
      byDate: byDate.map(d => ({
        date: d.date,
        requests: d.requests,
        cost: parseFloat(d.cost),
      })),
      topEndpoints: topEndpoints.map(e => ({
        path: e.path,
        requests: e.requests,
        cost: parseFloat(e.cost),
      })),
    };
  }

  async getMonthlyRequestCount(userId: number, apiId?: number): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const conditions = [
      eq(usageRecords.userId, userId),
      gte(usageRecords.createdAt, startOfMonth),
    ];

    if (apiId) {
      conditions.push(eq(usageRecords.apiId, apiId));
    }

    const [result] = await db.select({
      count: sql<number>`count(*)::int`,
    })
      .from(usageRecords)
      .where(and(...conditions));

    return result.count || 0;
  }
}

export const usageRecordRepository = new UsageRecordRepository();
