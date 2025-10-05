import { eq, desc } from 'drizzle-orm';
import { db, creditPackages } from '../db';

export interface CreatePackageData {
  name: string;
  description?: string;
  credits: string;
  price: string;
  currency?: string;
  bonusCredits?: string;
  isPopular?: boolean;
  displayOrder?: number;
}

export interface UpdatePackageData {
  name?: string;
  description?: string;
  credits?: string;
  price?: string;
  bonusCredits?: string;
  isPopular?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

export class CreditPackageRepository {
  /**
   * Create a new package
   */
  async create(data: CreatePackageData) {
    const [pkg] = await db.insert(creditPackages).values({
      ...data,
      currency: data.currency || 'INR',
    }).returning();

    return pkg;
  }

  /**
   * Find package by UID
   */
  async findByUid(uid: string) {
    const [pkg] = await db
      .select()
      .from(creditPackages)
      .where(eq(creditPackages.uid, uid));

    return pkg;
  }

  /**
   * Get all active packages
   */
  async findActive() {
    const packages = await db
      .select()
      .from(creditPackages)
      .where(eq(creditPackages.isActive, true))
      .orderBy(desc(creditPackages.displayOrder));

    return packages;
  }

  /**
   * Get all packages (admin)
   */
  async findAll() {
    const packages = await db
      .select()
      .from(creditPackages)
      .orderBy(desc(creditPackages.displayOrder));

    return packages;
  }

  /**
   * Update package
   */
  async update(uid: string, data: UpdatePackageData) {
    const [updated] = await db
      .update(creditPackages)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(creditPackages.uid, uid))
      .returning();

    return updated;
  }

  /**
   * Delete package (soft delete by marking inactive)
   */
  async delete(uid: string) {
    const [updated] = await db
      .update(creditPackages)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(creditPackages.uid, uid))
      .returning();

    return updated;
  }
}

export const creditPackageRepository = new CreditPackageRepository();
