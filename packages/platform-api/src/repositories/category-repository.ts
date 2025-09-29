import { db, apiCategories, apis } from '../db';
import { eq, sql, desc } from 'drizzle-orm';

export interface CreateCategoryData {
  name: string;
  description?: string;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
}

export interface CategoryWithApiCount {
  id: number;
  name: string;
  description: string | null;
  apiCount: number;
  createdAt: Date;
}

export class CategoryRepository {
  async create(data: CreateCategoryData) {
    const [category] = await db
      .insert(apiCategories)
      .values({
        name: data.name,
        description: data.description,
      })
      .returning();

    return category;
  }

  async findAll(): Promise<CategoryWithApiCount[]> {
    const result = await db
      .select({
        id: apiCategories.id,
        name: apiCategories.name,
        description: apiCategories.description,
        apiCount: sql<number>`COALESCE(COUNT(${apis.id}), 0)`.as('api_count'),
        createdAt: apiCategories.createdAt,
      })
      .from(apiCategories)
      .leftJoin(apis, eq(apiCategories.id, apis.categoryId))
      .groupBy(apiCategories.id)
      .orderBy(desc(apiCategories.createdAt));

    return result;
  }

  async findById(id: number) {
    const [category] = await db
      .select()
      .from(apiCategories)
      .where(eq(apiCategories.id, id))
      .limit(1);

    return category || null;
  }

  async findByName(name: string) {
    const [category] = await db
      .select()
      .from(apiCategories)
      .where(eq(apiCategories.name, name))
      .limit(1);

    return category || null;
  }

  async update(id: number, data: UpdateCategoryData) {
    const [category] = await db
      .update(apiCategories)
      .set({
        ...data,
      })
      .where(eq(apiCategories.id, id))
      .returning();

    return category || null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await db
      .delete(apiCategories)
      .where(eq(apiCategories.id, id));

    return result.rowCount !== null && result.rowCount > 0;
  }

  async exists(id: number): Promise<boolean> {
    const [category] = await db
      .select({ id: apiCategories.id })
      .from(apiCategories)
      .where(eq(apiCategories.id, id))
      .limit(1);

    return !!category;
  }

  async nameExists(name: string, excludeId?: number): Promise<boolean> {
    let query = db
      .select({ id: apiCategories.id })
      .from(apiCategories)
      .where(eq(apiCategories.name, name));

    if (excludeId) {
      query = query.where(sql`${apiCategories.id} != ${excludeId}`);
    }

    const [category] = await query.limit(1);
    return !!category;
  }
}