import { db, apis, apiCategories, apiAllowedMethods, apiRequiredHeaders, users } from '../db';
import { eq, desc, and, or, ilike, sql, inArray } from 'drizzle-orm';

export interface CreateAPIData {
  sellerId: number;
  categoryId?: number;
  name: string;
  description: string;
  version?: string;
  endpoint: string;
  baseUrl: string;
  documentation?: string;
  price?: string;
  pricingModel?: 'per_request' | 'monthly' | 'yearly' | 'free';
  requestLimit?: number;
  isPublic?: boolean;
  methods: string[];
  requiredHeaders?: Array<{
    name: string;
    value?: string;
    isStatic?: boolean;
    description?: string;
  }>;
}

export interface UpdateAPIData {
  categoryId?: number;
  name?: string;
  description?: string;
  version?: string;
  endpoint?: string;
  baseUrl?: string;
  documentation?: string;
  price?: string;
  pricingModel?: 'per_request' | 'monthly' | 'yearly' | 'free';
  requestLimit?: number;
  isPublic?: boolean;
  methods?: string[];
  requiredHeaders?: Array<{
    name: string;
    value?: string;
    isStatic?: boolean;
    description?: string;
  }>;
}

export interface APIWithDetails {
  id: number;
  uid: string;
  sellerId: number;
  categoryId: number | null;
  name: string;
  description: string;
  version: string;
  endpoint: string;
  baseUrl: string;
  documentation: string | null;
  price: string;
  pricingModel: string;
  requestLimit: number;
  isActive: boolean;
  isPublic: boolean;
  averageRating: string | null;
  totalRatings: number;
  totalSubscriptions: number;
  createdAt: Date;
  updatedAt: Date;
  seller: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  category: {
    id: number;
    name: string;
    description: string | null;
  } | null;
  methods: string[];
  requiredHeaders: Array<{
    id: number;
    headerName: string;
    headerValue: string | null;
    isStatic: boolean;
    description: string | null;
  }>;
}

export interface APISearchFilters {
  search?: string;
  categoryId?: number;
  pricingModel?: string;
  sellerId?: number;
  isActive?: boolean;
  isPublic?: boolean;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export class APIRepository {
  async create(data: CreateAPIData) {
    return await db.transaction(async (tx) => {
      // Create the main API record
      const [api] = await tx
        .insert(apis)
        .values({
          sellerId: data.sellerId,
          categoryId: data.categoryId,
          name: data.name,
          description: data.description,
          version: data.version || '1.0.0',
          endpoint: data.endpoint,
          baseUrl: data.baseUrl,
          documentation: data.documentation,
          price: data.price || '0.00',
          pricingModel: data.pricingModel || 'per_request',
          requestLimit: data.requestLimit || 1000,
          isActive: false, // Initially inactive until approved
          isPublic: data.isPublic !== false, // Default to public
        })
        .returning();

      // Insert allowed methods
      if (data.methods.length > 0) {
        await tx
          .insert(apiAllowedMethods)
          .values(
            data.methods.map(method => ({
              apiId: api.id,
              method: method.toUpperCase(),
            }))
          );
      }

      // Insert required headers
      if (data.requiredHeaders && data.requiredHeaders.length > 0) {
        await tx
          .insert(apiRequiredHeaders)
          .values(
            data.requiredHeaders.map(header => ({
              apiId: api.id,
              headerName: header.name,
              headerValue: header.value,
              isStatic: header.isStatic || false,
              description: header.description,
            }))
          );
      }

      return api;
    });
  }

  async findAll(
    filters?: APISearchFilters,
    pagination?: PaginationOptions
  ): Promise<{ apis: APIWithDetails[]; total: number }> {
    const conditions = [];

    if (filters?.search) {
      conditions.push(
        or(
          ilike(apis.name, `%${filters.search}%`),
          ilike(apis.description, `%${filters.search}%`)
        )
      );
    }

    if (filters?.categoryId) {
      conditions.push(eq(apis.categoryId, filters.categoryId));
    }

    if (filters?.pricingModel) {
      conditions.push(eq(apis.pricingModel, filters.pricingModel));
    }

    if (filters?.sellerId) {
      conditions.push(eq(apis.sellerId, filters.sellerId));
    }

    if (filters?.isActive !== undefined) {
      conditions.push(eq(apis.isActive, filters.isActive));
    }

    if (filters?.isPublic !== undefined) {
      conditions.push(eq(apis.isPublic, filters.isPublic));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(apis)
      .leftJoin(users, eq(apis.sellerId, users.id))
      .leftJoin(apiCategories, eq(apis.categoryId, apiCategories.id))
      .where(whereClause);

    // Get paginated results
    let query = db
      .select({
        api: apis,
        seller: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
        category: apiCategories,
      })
      .from(apis)
      .leftJoin(users, eq(apis.sellerId, users.id))
      .leftJoin(apiCategories, eq(apis.categoryId, apiCategories.id))
      .where(whereClause)
      .orderBy(desc(apis.createdAt));

    if (pagination) {
      query = query
        .limit(pagination.limit)
        .offset((pagination.page - 1) * pagination.limit);
    }

    const results = await query;
    console.log('Repository query results:', results.length, 'APIs found');

    // Get methods and headers for each API
    const apiIds = results.map(r => r.api.id);
    const [methods, headers] = await Promise.all([
      apiIds.length > 0 ? db
        .select()
        .from(apiAllowedMethods)
        .where(inArray(apiAllowedMethods.apiId, apiIds)) : [],
      apiIds.length > 0 ? db
        .select()
        .from(apiRequiredHeaders)
        .where(inArray(apiRequiredHeaders.apiId, apiIds)) : [],
    ]);

    // Group methods and headers by API ID
    const methodsByApi = methods.reduce((acc, method) => {
      if (!acc[method.apiId]) acc[method.apiId] = [];
      acc[method.apiId].push(method.method);
      return acc;
    }, {} as Record<number, string[]>);

    const headersByApi = headers.reduce((acc, header) => {
      if (!acc[header.apiId]) acc[header.apiId] = [];
      acc[header.apiId].push({
        id: header.id,
        headerName: header.headerName,
        headerValue: header.headerValue,
        isStatic: header.isStatic,
        description: header.description,
      });
      return acc;
    }, {} as Record<number, any[]>);

    // Combine data
    const apisWithDetails: APIWithDetails[] = results.map(result => {
      console.log('API Repository - Seller data for API', result.api.name, ':', result.seller);
      return {
        ...result.api,
        seller: result.seller,
        category: result.category,
        methods: methodsByApi[result.api.id] || [],
        requiredHeaders: headersByApi[result.api.id] || [],
      };
    });

    return {
      apis: apisWithDetails,
      total: count,
    };
  }

  async findById(id: number): Promise<APIWithDetails | null> {
    const result = await this.findAll({ isActive: undefined }, undefined);
    return result.apis.find(api => api.id === id) || null;
  }

  async findByUid(uid: string): Promise<APIWithDetails | null> {
    const [result] = await db
      .select({
        api: apis,
        seller: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
        category: apiCategories,
      })
      .from(apis)
      .leftJoin(users, eq(apis.sellerId, users.id))
      .leftJoin(apiCategories, eq(apis.categoryId, apiCategories.id))
      .where(eq(apis.uid, uid))
      .limit(1);

    if (!result) return null;

    // Get methods and headers
    const [methods, headers] = await Promise.all([
      db.select().from(apiAllowedMethods).where(eq(apiAllowedMethods.apiId, result.api.id)),
      db.select().from(apiRequiredHeaders).where(eq(apiRequiredHeaders.apiId, result.api.id)),
    ]);

    return {
      ...result.api,
      seller: result.seller,
      category: result.category,
      methods: methods.map(m => m.method),
      requiredHeaders: headers.map(h => ({
        id: h.id,
        headerName: h.headerName,
        headerValue: h.headerValue,
        isStatic: h.isStatic,
        description: h.description,
      })),
    };
  }

  async update(id: number, data: UpdateAPIData) {
    return await db.transaction(async (tx) => {
      // Update main API record
      const [api] = await tx
        .update(apis)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(apis.id, id))
        .returning();

      if (!api) return null;

      // Update methods if provided
      if (data.methods) {
        await tx.delete(apiAllowedMethods).where(eq(apiAllowedMethods.apiId, id));
        
        if (data.methods.length > 0) {
          await tx
            .insert(apiAllowedMethods)
            .values(
              data.methods.map(method => ({
                apiId: id,
                method: method.toUpperCase(),
              }))
            );
        }
      }

      // Update headers if provided
      if (data.requiredHeaders) {
        await tx.delete(apiRequiredHeaders).where(eq(apiRequiredHeaders.apiId, id));
        
        if (data.requiredHeaders.length > 0) {
          await tx
            .insert(apiRequiredHeaders)
            .values(
              data.requiredHeaders.map(header => ({
                apiId: id,
                headerName: header.name,
                headerValue: header.value,
                isStatic: header.isStatic || false,
                description: header.description,
              }))
            );
        }
      }

      return api;
    });
  }

  async delete(id: number): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // Delete related records first
      await tx.delete(apiAllowedMethods).where(eq(apiAllowedMethods.apiId, id));
      await tx.delete(apiRequiredHeaders).where(eq(apiRequiredHeaders.apiId, id));
      
      // Delete main record
      const result = await tx.delete(apis).where(eq(apis.id, id));
      
      return result.rowCount !== null && result.rowCount > 0;
    });
  }

  async updateStatus(id: number, isActive: boolean): Promise<boolean> {
    const result = await db
      .update(apis)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(apis.id, id));

    return result.rowCount !== null && result.rowCount > 0;
  }

  async exists(id: number): Promise<boolean> {
    const [api] = await db
      .select({ id: apis.id })
      .from(apis)
      .where(eq(apis.id, id))
      .limit(1);

    return !!api;
  }

  async findBySellerId(sellerId: number, filters?: APISearchFilters): Promise<APIWithDetails[]> {
    const result = await this.findAll(
      { ...filters, sellerId },
      undefined
    );
    return result.apis;
  }
}