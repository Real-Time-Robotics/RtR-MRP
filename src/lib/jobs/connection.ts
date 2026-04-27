// =============================================================================
// RTR MRP - BullMQ Redis connection
// Dedicated IORedis connection for BullMQ (maxRetriesPerRequest MUST be null
// for workers — BullMQ requirement). Do NOT reuse the cache connection because
// cache connection sets maxRetriesPerRequest: 3.
// =============================================================================

import IORedis, { type RedisOptions } from 'ioredis';
import { logger } from '@/lib/logger';

function getRedisUrl(): string | null {
  return process.env.REDIS_URL || null;
}

/**
 * When true, queues skip BullMQ entirely and use the in-memory fallback.
 * Useful in dev when Redis is unavailable.
 */
export function isInMemoryMode(): boolean {
  if (process.env.USE_INMEMORY_QUEUE === 'true') return true;
  if (!getRedisUrl()) return true;
  return false;
}

let bullConnection: IORedis | null = null;

const BULL_REDIS_OPTIONS: RedisOptions = {
  // BullMQ requirement: must be null for workers. See
  // https://docs.bullmq.io/guide/going-to-production
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: true,
  connectTimeout: 5000,
  retryStrategy(times) {
    // Exponential backoff up to 2s, keep trying.
    return Math.min(times * 200, 2000);
  },
};

/**
 * Singleton IORedis connection suitable for BullMQ Queue/Worker/QueueEvents.
 * Returns null when no REDIS_URL is configured.
 */
export function getBullConnection(): IORedis | null {
  if (isInMemoryMode()) return null;
  if (bullConnection) return bullConnection;

  const url = getRedisUrl();
  if (!url) return null;

  try {
    bullConnection = new IORedis(url, BULL_REDIS_OPTIONS);
    bullConnection.on('connect', () => logger.info('[JOBS] BullMQ Redis connected'));
    bullConnection.on('error', (err) => {
      logger.warn('[JOBS] BullMQ Redis error', { error: err.message });
    });
    // Kick off the connection lazily; failures are logged by the error handler.
    bullConnection.connect().catch(() => {
      logger.warn('[JOBS] BullMQ Redis connect failed — jobs will still be enqueued, workers may be offline');
    });
    return bullConnection;
  } catch (err) {
    logger.warn('[JOBS] Failed to create BullMQ connection', {
      error: (err as Error).message,
    });
    return null;
  }
}

/**
 * Closes the BullMQ connection. Call during graceful shutdown.
 */
export async function closeBullConnection(): Promise<void> {
  if (!bullConnection) return;
  try {
    await bullConnection.quit();
  } catch {
    bullConnection.disconnect();
  }
  bullConnection = null;
}
