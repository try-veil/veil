import { startCleanupJob } from './cleanup-expired-reservations';

// Start all background jobs
export function startBackgroundJobs() {
  console.log('🚀 Starting background jobs...');

  // Cleanup expired credit reservations every 1 minute
  const cleanupJob = startCleanupJob(1);

  // Return cleanup functions
  return {
    stopAll: () => {
      console.log('🛑 Stopping all background jobs...');
      cleanupJob.stop();
    },
  };
}
