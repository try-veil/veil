import { billingPeriodClosureJob } from './billing-period-closure';
import { invoiceReminderJob } from './invoice-reminder';
import { promotionCleanupJob } from './promotion-cleanup';

/**
 * Simple cron-like job scheduler for background tasks
 *
 * In production, consider using a proper job queue like:
 * - BullMQ
 * - node-cron
 * - Agenda
 * - AWS EventBridge
 */

export interface JobSchedule {
  name: string;
  job: () => Promise<any>;
  interval: number; // milliseconds
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runOnStartup?: boolean;
}

export interface JobExecutionResult {
  jobName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  success: boolean;
  result?: any;
  error?: string;
}

export class JobScheduler {
  private schedules: Map<string, JobSchedule> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;
  private executionHistory: JobExecutionResult[] = [];
  private readonly MAX_HISTORY = 100;

  constructor() {
    this.registerDefaultJobs();
  }

  /**
   * Register default jobs with their schedules
   */
  private registerDefaultJobs(): void {
    // Billing period closure - runs every 6 hours
    this.register({
      name: 'billing-period-closure',
      job: () => billingPeriodClosureJob.execute(),
      interval: 6 * 60 * 60 * 1000, // 6 hours
      enabled: true,
      runOnStartup: false // Don't run immediately on startup
    });

    // Invoice reminders - runs daily at 9 AM (approximation)
    this.register({
      name: 'invoice-reminder',
      job: () => invoiceReminderJob.execute(),
      interval: 24 * 60 * 60 * 1000, // 24 hours
      enabled: true,
      runOnStartup: false
    });

    // Promotion cleanup - runs daily at 2 AM (approximation)
    this.register({
      name: 'promotion-cleanup',
      job: () => promotionCleanupJob.execute(),
      interval: 24 * 60 * 60 * 1000, // 24 hours
      enabled: true,
      runOnStartup: false
    });
  }

  /**
   * Register a new job
   */
  register(schedule: JobSchedule): void {
    console.log(`[JobScheduler] Registering job: ${schedule.name}`);
    this.schedules.set(schedule.name, schedule);
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.log('[JobScheduler] Already running');
      return;
    }

    console.log('[JobScheduler] Starting scheduler...');
    this.isRunning = true;

    // Schedule all enabled jobs
    for (const [name, schedule] of this.schedules.entries()) {
      if (schedule.enabled) {
        this.scheduleJob(name, schedule);

        // Run immediately on startup if configured
        if (schedule.runOnStartup) {
          this.executeJob(name, schedule);
        }
      }
    }

    console.log(`[JobScheduler] Scheduler started with ${this.schedules.size} jobs`);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('[JobScheduler] Not running');
      return;
    }

    console.log('[JobScheduler] Stopping scheduler...');
    this.isRunning = false;

    // Clear all timers
    for (const [name, timer] of this.timers.entries()) {
      clearTimeout(timer);
      console.log(`[JobScheduler] Cleared timer for job: ${name}`);
    }

    this.timers.clear();
    console.log('[JobScheduler] Scheduler stopped');
  }

  /**
   * Schedule a single job
   */
  private scheduleJob(name: string, schedule: JobSchedule): void {
    const nextRun = new Date(Date.now() + schedule.interval);
    schedule.nextRun = nextRun;

    console.log(`[JobScheduler] Scheduling ${name} to run in ${schedule.interval / 1000}s (at ${nextRun.toISOString()})`);

    const timer = setTimeout(() => {
      this.executeJob(name, schedule);
      // Reschedule after execution
      this.scheduleJob(name, schedule);
    }, schedule.interval);

    this.timers.set(name, timer);
  }

  /**
   * Execute a job
   */
  private async executeJob(name: string, schedule: JobSchedule): Promise<void> {
    const startTime = new Date();
    console.log(`[JobScheduler] Executing job: ${name} at ${startTime.toISOString()}`);

    const executionResult: JobExecutionResult = {
      jobName: name,
      startTime,
      endTime: new Date(),
      duration: 0,
      success: false
    };

    try {
      const result = await schedule.job();
      const endTime = new Date();

      executionResult.endTime = endTime;
      executionResult.duration = endTime.getTime() - startTime.getTime();
      executionResult.success = true;
      executionResult.result = result;

      schedule.lastRun = startTime;

      console.log(`[JobScheduler] Job ${name} completed successfully in ${executionResult.duration}ms`);

    } catch (error) {
      const endTime = new Date();

      executionResult.endTime = endTime;
      executionResult.duration = endTime.getTime() - startTime.getTime();
      executionResult.success = false;
      executionResult.error = error instanceof Error ? error.message : 'Unknown error';

      console.error(`[JobScheduler] Job ${name} failed after ${executionResult.duration}ms:`, error);
    }

    // Store execution result in history
    this.addToHistory(executionResult);
  }

  /**
   * Manually trigger a job execution
   */
  async triggerJob(name: string): Promise<JobExecutionResult> {
    const schedule = this.schedules.get(name);

    if (!schedule) {
      throw new Error(`Job ${name} not found`);
    }

    console.log(`[JobScheduler] Manually triggering job: ${name}`);

    const startTime = new Date();
    const executionResult: JobExecutionResult = {
      jobName: name,
      startTime,
      endTime: new Date(),
      duration: 0,
      success: false
    };

    try {
      const result = await schedule.job();
      const endTime = new Date();

      executionResult.endTime = endTime;
      executionResult.duration = endTime.getTime() - startTime.getTime();
      executionResult.success = true;
      executionResult.result = result;

      this.addToHistory(executionResult);

      return executionResult;

    } catch (error) {
      const endTime = new Date();

      executionResult.endTime = endTime;
      executionResult.duration = endTime.getTime() - startTime.getTime();
      executionResult.success = false;
      executionResult.error = error instanceof Error ? error.message : 'Unknown error';

      this.addToHistory(executionResult);

      throw error;
    }
  }

  /**
   * Add execution result to history
   */
  private addToHistory(result: JobExecutionResult): void {
    this.executionHistory.unshift(result);

    // Keep only the last MAX_HISTORY executions
    if (this.executionHistory.length > this.MAX_HISTORY) {
      this.executionHistory = this.executionHistory.slice(0, this.MAX_HISTORY);
    }
  }

  /**
   * Get execution history
   */
  getHistory(jobName?: string, limit: number = 10): JobExecutionResult[] {
    let history = this.executionHistory;

    if (jobName) {
      history = history.filter(r => r.jobName === jobName);
    }

    return history.slice(0, limit);
  }

  /**
   * Get all registered jobs
   */
  getJobs(): Array<{
    name: string;
    enabled: boolean;
    interval: number;
    lastRun?: Date;
    nextRun?: Date;
  }> {
    return Array.from(this.schedules.entries()).map(([name, schedule]) => ({
      name,
      enabled: schedule.enabled,
      interval: schedule.interval,
      lastRun: schedule.lastRun,
      nextRun: schedule.nextRun
    }));
  }

  /**
   * Enable a job
   */
  enableJob(name: string): void {
    const schedule = this.schedules.get(name);

    if (!schedule) {
      throw new Error(`Job ${name} not found`);
    }

    schedule.enabled = true;

    if (this.isRunning) {
      this.scheduleJob(name, schedule);
    }

    console.log(`[JobScheduler] Enabled job: ${name}`);
  }

  /**
   * Disable a job
   */
  disableJob(name: string): void {
    const schedule = this.schedules.get(name);

    if (!schedule) {
      throw new Error(`Job ${name} not found`);
    }

    schedule.enabled = false;

    const timer = this.timers.get(name);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(name);
    }

    console.log(`[JobScheduler] Disabled job: ${name}`);
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    totalJobs: number;
    enabledJobs: number;
    activeTimers: number;
    executionHistory: number;
  } {
    return {
      isRunning: this.isRunning,
      totalJobs: this.schedules.size,
      enabledJobs: Array.from(this.schedules.values()).filter(s => s.enabled).length,
      activeTimers: this.timers.size,
      executionHistory: this.executionHistory.length
    };
  }
}

// Export singleton instance
export const jobScheduler = new JobScheduler();