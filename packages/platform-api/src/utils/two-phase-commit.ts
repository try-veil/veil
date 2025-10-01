/**
 * Two-Phase Commit (2PC) Implementation
 *
 * Ensures atomicity across distributed systems (BFF Database + Gateway)
 *
 * Phase 1 (PREPARE): Reserve resources, validate operations
 * Phase 2 (COMMIT): Execute operations, or ROLLBACK on failure
 */

export interface TransactionPhase<T> {
  name: string;
  prepare: () => Promise<T>;
  commit: (preparedData: T) => Promise<void>;
  rollback: (preparedData?: T) => Promise<void>;
}

export interface TransactionOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  onRetry?: (phase: string, attempt: number, error: Error) => void;
}

export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  phase?: string;
  attempts?: number;
}

/**
 * Execute a two-phase commit transaction
 *
 * @example
 * const result = await executeTwoPhaseCommit({
 *   phases: [
 *     {
 *       name: 'database',
 *       prepare: async () => db.insert(api).returning(),
 *       commit: async (api) => console.log('Committed:', api.id),
 *       rollback: async (api) => db.delete(apis).where(eq(apis.id, api.id))
 *     },
 *     {
 *       name: 'gateway',
 *       prepare: async () => ({ config: apiConfig }),
 *       commit: async ({ config }) => gatewayService.registerAPI(config),
 *       rollback: async ({ config }) => gatewayService.unregisterAPI(config.uid)
 *     }
 *   ],
 *   options: { maxRetries: 3 }
 * });
 */
export async function executeTwoPhaseCommit<T = any>(params: {
  phases: TransactionPhase<any>[];
  options?: TransactionOptions;
}): Promise<TransactionResult<T>> {
  const { phases, options = {} } = params;
  const {
    maxRetries = 3,
    retryDelayMs = 1000,
    timeoutMs = 30000,
    onRetry,
  } = options;

  const preparedData: Map<string, any> = new Map();
  let currentPhase = '';
  let totalAttempts = 0;

  try {
    // PHASE 1: PREPARE
    // Execute all prepare operations and collect prepared data
    console.log('[2PC] Starting PREPARE phase');

    for (const phase of phases) {
      currentPhase = `prepare:${phase.name}`;
      console.log(`[2PC] Preparing ${phase.name}...`);

      const data = await executeWithRetry(
        async () => phase.prepare(),
        {
          maxRetries,
          retryDelayMs,
          timeoutMs,
          onRetry: (attempt, error) => {
            totalAttempts++;
            onRetry?.(currentPhase, attempt, error);
          },
        }
      );

      preparedData.set(phase.name, data);
      console.log(`[2PC] ✓ ${phase.name} prepared successfully`);
    }

    // PHASE 2: COMMIT
    // If all preparations succeeded, commit all phases
    console.log('[2PC] Starting COMMIT phase');

    for (const phase of phases) {
      currentPhase = `commit:${phase.name}`;
      console.log(`[2PC] Committing ${phase.name}...`);

      const data = preparedData.get(phase.name);

      await executeWithRetry(
        async () => phase.commit(data),
        {
          maxRetries,
          retryDelayMs,
          timeoutMs,
          onRetry: (attempt, error) => {
            totalAttempts++;
            onRetry?.(currentPhase, attempt, error);
          },
        }
      );

      console.log(`[2PC] ✓ ${phase.name} committed successfully`);
    }

    console.log('[2PC] Transaction completed successfully');

    return {
      success: true,
      data: preparedData.get(phases[0].name) as T, // Return first phase's data
      attempts: totalAttempts,
    };
  } catch (error) {
    // ROLLBACK: If any phase fails, rollback all prepared phases
    console.error(`[2PC] Transaction failed at ${currentPhase}:`, error);
    console.log('[2PC] Starting ROLLBACK phase');

    // Rollback in reverse order
    const phasesToRollback = Array.from(preparedData.keys()).reverse();

    for (const phaseName of phasesToRollback) {
      try {
        const phase = phases.find((p) => p.name === phaseName);
        if (!phase) continue;

        console.log(`[2PC] Rolling back ${phaseName}...`);
        const data = preparedData.get(phaseName);

        await executeWithRetry(
          async () => phase.rollback(data),
          {
            maxRetries: 2, // Fewer retries for rollback
            retryDelayMs,
            timeoutMs: 10000, // Shorter timeout for rollback
          }
        );

        console.log(`[2PC] ✓ ${phaseName} rolled back successfully`);
      } catch (rollbackError) {
        console.error(`[2PC] ✗ Failed to rollback ${phaseName}:`, rollbackError);
        // Continue with other rollbacks even if one fails
      }
    }

    console.log('[2PC] Rollback completed');

    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      phase: currentPhase,
      attempts: totalAttempts,
    };
  }
}

/**
 * Execute an async operation with retry logic and exponential backoff
 */
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries: number;
    retryDelayMs: number;
    timeoutMs: number;
    onRetry?: (attempt: number, error: Error) => void;
  }
): Promise<T> {
  const { maxRetries, retryDelayMs, timeoutMs, onRetry } = options;
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Execute with timeout
      return await executeWithTimeout(operation(), timeoutMs);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Calculate exponential backoff delay
      const delay = retryDelayMs * Math.pow(2, attempt - 1);

      console.log(
        `[2PC] Attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`,
        lastError.message
      );

      onRetry?.(attempt, lastError);

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Execute a promise with a timeout
 */
async function executeWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Simplified two-phase commit for common use cases
 *
 * @example
 * const result = await simpleTwoPhaseCommit({
 *   dbOperation: async () => db.insert(api).returning(),
 *   dbRollback: async (api) => db.delete(apis).where(eq(apis.id, api.id)),
 *   externalOperation: async (api) => gatewayService.registerAPI(api),
 *   externalRollback: async (api) => gatewayService.unregisterAPI(api.uid)
 * });
 */
export async function simpleTwoPhaseCommit<TDb, TExternal = void>(params: {
  dbOperation: () => Promise<TDb>;
  dbRollback: (data: TDb) => Promise<void>;
  externalOperation: (dbData: TDb) => Promise<TExternal>;
  externalRollback?: (dbData: TDb, externalData?: TExternal) => Promise<void>;
  options?: TransactionOptions;
}): Promise<TransactionResult<TDb>> {
  const {
    dbOperation,
    dbRollback,
    externalOperation,
    externalRollback,
    options,
  } = params;

  return executeTwoPhaseCommit({
    phases: [
      {
        name: 'database',
        prepare: dbOperation,
        commit: async () => {}, // DB operation is already committed in prepare
        rollback: dbRollback,
      },
      {
        name: 'external',
        prepare: async () => null, // No external prepare needed
        commit: async () => {
          const dbData = preparedDataRef.get('database');
          await externalOperation(dbData);
        },
        rollback: async () => {
          if (externalRollback) {
            const dbData = preparedDataRef.get('database');
            await externalRollback(dbData);
          }
        },
      },
    ],
    options,
  });

  // Helper to pass data between phases
  const preparedDataRef = new Map<string, any>();
}

/**
 * Idempotency key manager for preventing duplicate operations
 */
export class IdempotencyManager {
  private keys: Map<string, { timestamp: number; result: any }> = new Map();
  private readonly ttlMs: number;

  constructor(ttlMs: number = 3600000) {
    // Default 1 hour TTL
    this.ttlMs = ttlMs;

    // Cleanup expired keys every 5 minutes
    setInterval(() => this.cleanup(), 300000);
  }

  /**
   * Check if an operation was already executed
   */
  async check<T>(key: string): Promise<T | null> {
    const entry = this.keys.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.keys.delete(key);
      return null;
    }

    console.log(`[Idempotency] Found cached result for key: ${key}`);
    return entry.result as T;
  }

  /**
   * Store the result of an operation
   */
  async store(key: string, result: any): Promise<void> {
    this.keys.set(key, {
      timestamp: Date.now(),
      result,
    });

    console.log(`[Idempotency] Stored result for key: ${key}`);
  }

  /**
   * Remove expired keys
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.keys.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.keys.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[Idempotency] Cleaned up ${removed} expired keys`);
    }
  }

  /**
   * Clear all keys (for testing)
   */
  clear(): void {
    this.keys.clear();
  }
}

// Global idempotency manager instance
export const idempotencyManager = new IdempotencyManager();
