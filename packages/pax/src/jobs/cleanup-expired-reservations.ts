import { creditReservationService } from '../services/credit-reservation-service';

/**
 * Cleanup expired credit reservations
 * Run this job periodically (every 1 minute recommended)
 */
export async function cleanupExpiredReservations() {
  try {
    const releasedCount = await creditReservationService.cleanupExpiredReservations();

    if (releasedCount > 0) {
      console.log(`🧹 Cleaned up ${releasedCount} expired credit reservations`);
    }

    return {
      success: true,
      releasedCount,
    };
  } catch (error) {
    console.error('❌ Failed to cleanup expired reservations:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Start the cleanup job with a specified interval
 * @param intervalMinutes - Run interval in minutes (default: 1)
 */
export function startCleanupJob(intervalMinutes: number = 1) {
  const intervalMs = intervalMinutes * 60 * 1000;

  // Run immediately on start
  cleanupExpiredReservations();

  // Then run on interval
  const jobInterval = setInterval(() => {
    cleanupExpiredReservations();
  }, intervalMs);

  console.log(`🔄 Credit reservation cleanup job started (interval: ${intervalMinutes} min)`);

  return {
    stop: () => {
      clearInterval(jobInterval);
      console.log('🛑 Credit reservation cleanup job stopped');
    },
  };
}
