import { eq, and, lte, sql } from 'drizzle-orm';
import { db, creditReservations } from '../db';

export interface CreateReservationData {
  creditAccountId: number;
  transactionId: number;
  amount: string;
  purpose: string;
  referenceType?: string;
  referenceId?: string;
  expiresAt?: Date;
}

export class CreditReservationRepository {
  /**
   * Create a new reservation
   */
  async create(data: CreateReservationData, tx?: any) {
    const dbInstance = tx || db;
    const [reservation] = await dbInstance.insert(creditReservations).values(data).returning();
    return reservation;
  }

  /**
   * Find reservation by UID
   */
  async findByUid(uid: string) {
    const [reservation] = await db
      .select()
      .from(creditReservations)
      .where(eq(creditReservations.uid, uid));

    return reservation;
  }

  /**
   * Find reservation by reference
   */
  async findByReference(referenceType: string, referenceId: string) {
    const [reservation] = await db
      .select()
      .from(creditReservations)
      .where(
        and(
          eq(creditReservations.referenceType, referenceType),
          eq(creditReservations.referenceId, referenceId),
          eq(creditReservations.status, 'active')
        )
      );

    return reservation;
  }

  /**
   * Get active reservations for account
   */
  async findActiveByAccount(creditAccountId: number) {
    const reservations = await db
      .select()
      .from(creditReservations)
      .where(
        and(
          eq(creditReservations.creditAccountId, creditAccountId),
          eq(creditReservations.status, 'active')
        )
      );

    return reservations;
  }

  /**
   * Settle reservation
   */
  async settle(id: number, settledAmount: string, settleTransactionId: number) {
    const [updated] = await db
      .update(creditReservations)
      .set({
        status: 'settled',
        settledAmount,
        settledAt: new Date(),
        settleTransactionId,
        updatedAt: new Date(),
      })
      .where(eq(creditReservations.id, id))
      .returning();

    return updated;
  }

  /**
   * Release reservation
   */
  async release(id: number, releasedAmount: string, releaseTransactionId: number) {
    const [updated] = await db
      .update(creditReservations)
      .set({
        status: 'released',
        releasedAmount,
        releasedAt: new Date(),
        releaseTransactionId,
        updatedAt: new Date(),
      })
      .where(eq(creditReservations.id, id))
      .returning();

    return updated;
  }

  /**
   * Get expired reservations
   */
  async findExpired() {
    const now = new Date();

    const reservations = await db
      .select()
      .from(creditReservations)
      .where(
        and(
          eq(creditReservations.status, 'active'),
          lte(creditReservations.expiresAt, now)
        )
      );

    return reservations;
  }

  /**
   * Mark as expired
   */
  async markExpired(id: number) {
    const [updated] = await db
      .update(creditReservations)
      .set({
        status: 'expired',
        updatedAt: new Date(),
      })
      .where(eq(creditReservations.id, id))
      .returning();

    return updated;
  }

  /**
   * Update reservation status with optional metadata
   */
  async updateStatus(
    id: number,
    status: 'active' | 'settled' | 'released' | 'expired',
    metadata: {
      settledAmount?: string;
      settledAt?: Date;
      settleTransactionId?: number;
      releasedAmount?: string;
      releasedAt?: Date;
      releaseTransactionId?: number;
    } = {},
    tx?: any
  ) {
    const dbInstance = tx || db;

    const [updated] = await dbInstance
      .update(creditReservations)
      .set({
        status,
        ...metadata,
        updatedAt: new Date(),
      })
      .where(eq(creditReservations.id, id))
      .returning();

    return updated;
  }

  /**
   * Lock reservation for update (within transaction)
   * Uses SKIP LOCKED to avoid deadlocks
   */
  async lockForUpdate(reservationUid: string, tx?: any) {
    const dbInstance = tx || db;

    try {
      // Set a statement timeout for this query (2 seconds)
      await dbInstance.execute(sql`SET LOCAL statement_timeout = '2s'`);

      const [reservation] = await dbInstance
        .select()
        .from(creditReservations)
        .where(eq(creditReservations.uid, reservationUid))
        .for('update', { skipLocked: true });

      if (!reservation) {
        throw new Error(`Reservation ${reservationUid} is currently locked by another transaction`);
      }

      return reservation;
    } catch (error: any) {
      console.error(`❌ lockForUpdate failed for reservation ${reservationUid}:`, error.message);
      throw error;
    }
  }
}

export const creditReservationRepository = new CreditReservationRepository();
