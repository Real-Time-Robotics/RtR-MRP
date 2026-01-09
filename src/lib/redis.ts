import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Setup Redis client with singleton pattern to avoid multiple connections in dev
const globalForRedis = global as unknown as { redis: IORedis };

export const redis =
  globalForRedis.redis ||
  new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
  });

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

export const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};
