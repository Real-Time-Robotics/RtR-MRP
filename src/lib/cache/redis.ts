// @ts-nocheck
// =============================================================================
// RTR MRP - REDIS CACHE
// Tenant-isolated caching layer
// NOTE: Install ioredis before using: npm install ioredis @types/ioredis
// =============================================================================

import Redis from 'ioredis';

// =============================================================================
// REDIS CLIENT
// =============================================================================

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    redisInstance = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
      // Connection pool settings
      family: 4, // IPv4
      keepAlive: 30000,
      connectTimeout: 10000,
    });

    redisInstance.on('connect', () => {
      // Connected to Redis
    });

    redisInstance.on('error', (err) => {
      console.error('[REDIS] Error:', err);
    });

    redisInstance.on('close', () => {
      // Redis connection closed
    });
  }

  return redisInstance;
}

// =============================================================================
// CACHE KEY PATTERNS (Tenant-isolated)
// =============================================================================

export const cacheKeys = {
  // ==========================================================================
  // TENANT-AWARE KEYS (Multi-tenancy)
  // ==========================================================================
  tenant: {
    info: (tenantId: string) => `tenant:${tenantId}:info`,
    features: (tenantId: string) => `tenant:${tenantId}:features`,
    limits: (tenantId: string) => `tenant:${tenantId}:limits`,
    // Tenant-specific parts
    parts: {
      list: (tenantId: string) => `tenant:${tenantId}:parts:list`,
      item: (tenantId: string, partId: string) => `tenant:${tenantId}:parts:${partId}`,
      byCategory: (tenantId: string, category: string) => `tenant:${tenantId}:parts:cat:${category}`,
      count: (tenantId: string) => `tenant:${tenantId}:parts:count`,
    },
    // Tenant-specific inventory
    inventory: {
      list: (tenantId: string) => `tenant:${tenantId}:inventory:list`,
      item: (tenantId: string, partId: string) => `tenant:${tenantId}:inventory:${partId}`,
      lowStock: (tenantId: string) => `tenant:${tenantId}:inventory:lowstock`,
      value: (tenantId: string) => `tenant:${tenantId}:inventory:value`,
    },
    // Tenant-specific sales
    sales: {
      list: (tenantId: string) => `tenant:${tenantId}:sales:list`,
      item: (tenantId: string, orderId: string) => `tenant:${tenantId}:sales:${orderId}`,
      pending: (tenantId: string) => `tenant:${tenantId}:sales:pending`,
      monthly: (tenantId: string, month: string) => `tenant:${tenantId}:sales:monthly:${month}`,
    },
    // Tenant-specific production
    production: {
      list: (tenantId: string) => `tenant:${tenantId}:production:list`,
      item: (tenantId: string, woId: string) => `tenant:${tenantId}:production:${woId}`,
      active: (tenantId: string) => `tenant:${tenantId}:production:active`,
      schedule: (tenantId: string, date: string) => `tenant:${tenantId}:production:schedule:${date}`,
    },
    // Tenant-specific dashboard
    dashboard: {
      kpis: (tenantId: string) => `tenant:${tenantId}:dashboard:kpis`,
      charts: (tenantId: string) => `tenant:${tenantId}:dashboard:charts`,
      alerts: (tenantId: string) => `tenant:${tenantId}:dashboard:alerts`,
    },
    // Tenant-specific MRP
    mrp: {
      lastRun: (tenantId: string) => `tenant:${tenantId}:mrp:lastrun`,
      suggestions: (tenantId: string) => `tenant:${tenantId}:mrp:suggestions`,
    },
  },

  // User-specific (cross-tenant)
  user: {
    session: (userId: string) => `user:${userId}:session`,
    preferences: (userId: string) => `user:${userId}:preferences`,
    notifications: (userId: string) => `user:${userId}:notifications`,
  },

  // Rate limiting
  rateLimit: {
    api: (tenantId: string, endpoint: string) => `ratelimit:${tenantId}:api:${endpoint}`,
    user: (userId: string, action: string) => `ratelimit:user:${userId}:${action}`,
  },

  // ==========================================================================
  // LEGACY KEYS (Single-tenant compatibility)
  // ==========================================================================
  dashboardStats: () => 'dashboard:stats',

  workOrders: (params: {
    status?: string | null;
    page?: number;
    pageSize?: number;
    sortBy?: string | null;
    sortOrder?: string | null;
    search?: string | null;
    [key: string]: unknown;
  } = {}) =>
    `workorders:${params.status || 'all'}:page:${params.page || 1}:size:${params.pageSize || 20}:sort:${params.sortBy || 'date'}:${params.sortOrder || 'desc'}:q:${params.search || ''}`,

  salesOrders: (params: {
    status?: string | null;
    page?: number;
    pageSize?: number;
    sortBy?: string | null;
    sortOrder?: string | null;
    search?: string | null;
    [key: string]: unknown;
  } = {}) =>
    `salesorders:${params.status || 'all'}:page:${params.page || 1}:size:${params.pageSize || 20}:sort:${params.sortBy || 'date'}:${params.sortOrder || 'desc'}:q:${params.search || ''}`,

  parts: (params: {
    page?: number;
    pageSize?: number;
    sortBy?: string | null;
    sortOrder?: string | null;
    search?: string | null;
    category?: string | null;
    [key: string]: unknown;
  } = {}) =>
    `parts:page:${params.page || 1}:size:${params.pageSize || 20}:sort:${params.sortBy || 'partNumber'}:${params.sortOrder || 'asc'}:cat:${params.category || 'all'}:q:${params.search || ''}`,

  suppliers: (params: {
    page?: number;
    pageSize?: number;
    sortBy?: string | null;
    sortOrder?: string | null;
    search?: string | null;
    [key: string]: unknown;
  } = {}) =>
    `suppliers:page:${params.page || 1}:size:${params.pageSize || 20}:sort:${params.sortBy || 'name'}:${params.sortOrder || 'asc'}:q:${params.search || ''}`,

  // Single item keys
  workOrder: (id: string) => `workorder:${id}`,
  salesOrder: (id: string) => `salesorder:${id}`,
  part: (id: string) => `part:${id}`,
};

// =============================================================================
// CACHE TTL SETTINGS (in seconds)
// =============================================================================

export const cacheTTL = {
  short: 60,           // 1 minute
  medium: 300,         // 5 minutes
  long: 600,           // 10 minutes
  extended: 1800,      // 30 minutes
  hour: 3600,          // 1 hour
  day: 86400,          // 24 hours

  // Uppercase aliases for legacy compatibility
  SHORT: 60,
  MEDIUM: 300,
  LONG: 600,
  STANDARD: 300,       // Standard cache duration (5 minutes)
  HOUR: 3600,
  DAY: 86400,

  // Specific TTLs
  dashboard: 60,       // Dashboard updates every minute
  partsList: 300,      // Parts list cached for 5 minutes
  inventory: 60,       // Inventory changes frequently
  reports: 1800,       // Reports cached for 30 minutes
  userPrefs: 3600,     // User preferences for 1 hour
};

// =============================================================================
// CACHE OPERATIONS
// =============================================================================

/**
 * Get value from cache
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const redisClient = getRedis();
    const data = await redisClient.get(key);
    
    if (data) {
      return JSON.parse(data) as T;
    }
    
    return null;
  } catch (error) {
    console.error('[CACHE] Get error:', error);
    return null;
  }
}

/**
 * Set value in cache with TTL
 */
export async function setCache<T>(
  key: string,
  data: T,
  ttlSeconds: number = cacheTTL.medium
): Promise<boolean> {
  try {
    const redisClient = getRedis();
    await redisClient.setex(key, ttlSeconds, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('[CACHE] Set error:', error);
    return false;
  }
}

/**
 * Delete single key from cache
 */
export async function deleteCache(key: string): Promise<boolean> {
  try {
    const redisClient = getRedis();
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('[CACHE] Delete error:', error);
    return false;
  }
}

/**
 * Delete multiple keys matching pattern
 */
export async function deleteCachePattern(pattern: string): Promise<number> {
  try {
    const redisClient = getRedis();
    const keys = await redisClient.keys(pattern);
    
    if (keys.length === 0) {
      return 0;
    }
    
    const deleted = await redisClient.del(...keys);
    return deleted;
  } catch (error) {
    console.error('[CACHE] Delete pattern error:', error);
    return 0;
  }
}

/**
 * Invalidate all cache for a tenant
 */
export async function invalidateTenantCache(tenantId: string): Promise<number> {
  return deleteCachePattern(`tenant:${tenantId}:*`);
}

/**
 * Check if key exists
 */
export async function hasCache(key: string): Promise<boolean> {
  try {
    const redisClient = getRedis();
    const exists = await redisClient.exists(key);
    return exists === 1;
  } catch (error) {
    console.error('[CACHE] Exists error:', error);
    return false;
  }
}

/**
 * Get remaining TTL for key
 */
export async function getCacheTTL(key: string): Promise<number> {
  try {
    const redisClient = getRedis();
    return await redisClient.ttl(key);
  } catch (error) {
    console.error('[CACHE] TTL error:', error);
    return -1;
  }
}

// =============================================================================
// CACHE-ASIDE PATTERN
// =============================================================================

/**
 * Get from cache or fetch from source
 * Implements cache-aside pattern
 */
export async function cacheAside<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = cacheTTL.medium
): Promise<T> {
  // Try cache first
  const cached = await getCache<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  // Fetch from source
  const data = await fetchFn();
  
  // Store in cache
  await setCache(key, data, ttlSeconds);
  
  return data;
}

/**
 * Force refresh cache
 */
export async function refreshCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = cacheTTL.medium
): Promise<T> {
  const data = await fetchFn();
  await setCache(key, data, ttlSeconds);
  return data;
}

// =============================================================================
// RATE LIMITING
// =============================================================================

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check rate limit using sliding window
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const redisClient = getRedis();
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);
    
    // Use sorted set for sliding window
    const pipeline = redisClient.pipeline();
    
    // Remove old entries
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Count current entries
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, now, `${now}`);
    
    // Set expiry
    pipeline.expire(key, windowSeconds);
    
    const results = await pipeline.exec();
    const count = results?.[1]?.[1] as number || 0;
    
    return {
      allowed: count < limit,
      remaining: Math.max(0, limit - count - 1),
      resetAt: new Date(now + (windowSeconds * 1000)),
    };
  } catch (error) {
    console.error('[RATE_LIMIT] Error:', error);
    // Allow on error (fail open)
    return {
      allowed: true,
      remaining: limit,
      resetAt: new Date(Date.now() + (windowSeconds * 1000)),
    };
  }
}

/**
 * Simple increment-based rate limit
 */
export async function incrementRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const redisClient = getRedis();
    
    const pipeline = redisClient.pipeline();
    pipeline.incr(key);
    pipeline.ttl(key);
    
    const results = await pipeline.exec();
    const count = results?.[0]?.[1] as number || 0;
    const ttl = results?.[1]?.[1] as number || -1;
    
    // Set expiry on first request
    if (ttl === -1) {
      await redisClient.expire(key, windowSeconds);
    }
    
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt: new Date(Date.now() + (ttl > 0 ? ttl * 1000 : windowSeconds * 1000)),
    };
  } catch (error) {
    console.error('[RATE_LIMIT] Error:', error);
    return {
      allowed: true,
      remaining: limit,
      resetAt: new Date(Date.now() + (windowSeconds * 1000)),
    };
  }
}

// =============================================================================
// DISTRIBUTED LOCKING
// =============================================================================

/**
 * Acquire distributed lock
 */
export async function acquireLock(
  lockKey: string,
  ttlSeconds: number = 30
): Promise<boolean> {
  try {
    const redisClient = getRedis();
    const result = await redisClient.set(
      `lock:${lockKey}`,
      Date.now().toString(),
      'EX',
      ttlSeconds,
      'NX'
    );
    return result === 'OK';
  } catch (error) {
    console.error('[LOCK] Acquire error:', error);
    return false;
  }
}

/**
 * Release distributed lock
 */
export async function releaseLock(lockKey: string): Promise<boolean> {
  try {
    const redisClient = getRedis();
    await redisClient.del(`lock:${lockKey}`);
    return true;
  } catch (error) {
    console.error('[LOCK] Release error:', error);
    return false;
  }
}

/**
 * Execute function with lock
 */
export async function withLock<T>(
  lockKey: string,
  fn: () => Promise<T>,
  ttlSeconds: number = 30
): Promise<T | null> {
  const acquired = await acquireLock(lockKey, ttlSeconds);
  
  if (!acquired) {
    console.warn(`[LOCK] Could not acquire lock: ${lockKey}`);
    return null;
  }
  
  try {
    return await fn();
  } finally {
    await releaseLock(lockKey);
  }
}

// =============================================================================
// LEGACY COMPATIBILITY EXPORTS
// =============================================================================

// Export redis client for direct access
export const redis = {
  get: getRedis,
  isConnected: () => {
    try {
      const client = getRedis();
      return client.status === 'ready';
    } catch {
      return false;
    }
  },
  ping: async () => {
    try {
      const client = getRedis();
      return await client.ping();
    } catch {
      return null;
    }
  },
  info: async () => {
    try {
      const client = getRedis();
      return await client.info();
    } catch {
      return null;
    }
  },
  // Pipeline/Multi operations (proxy to Redis client)
  multi: () => getRedis().multi(),
  pipeline: () => getRedis().pipeline(),
  // Key operations (proxy to Redis client)
  keys: (pattern: string) => getRedis().keys(pattern),
  del: (...keys: string[]) => getRedis().del(...keys),
  exists: (...keys: string[]) => getRedis().exists(...keys),
  expire: (key: string, seconds: number) => getRedis().expire(key, seconds),
  ttl: (key: string) => getRedis().ttl(key),
  // Sorted set operations (for rate limiting)
  zadd: (key: string, score: number, member: string) => getRedis().zadd(key, score, member),
  zremrangebyscore: (key: string, min: number | string, max: number | string) =>
    getRedis().zremrangebyscore(key, min, max),
  zcard: (key: string) => getRedis().zcard(key),
  // String operations
  setex: (key: string, seconds: number, value: string) => getRedis().setex(key, seconds, value),
  incr: (key: string) => getRedis().incr(key),
};

// Cache patterns for invalidation
export const cachePatterns = {
  dashboard: (tenantId: string = '*') => `tenant:${tenantId}:dashboard:*`,
  parts: (tenantId: string = '*') => `tenant:${tenantId}:parts:*`,
  inventory: (tenantId: string = '*') => `tenant:${tenantId}:inventory:*`,
  sales: (tenantId: string = '*') => `tenant:${tenantId}:sales:*`,
  production: (tenantId: string = '*') => `tenant:${tenantId}:production:*`,
  mrp: (tenantId: string = '*') => `tenant:${tenantId}:mrp:*`,
  all: (tenantId: string = '*') => `tenant:${tenantId}:*`,
  // Legacy uppercase patterns
  ALL_WORK_ORDERS: 'workorders:*',
  ALL_DASHBOARD: 'dashboard:*',
  ALL_PARTS: 'parts:*',
  ALL_INVENTORY: 'inventory:*',
};

// Stats tracking
let cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0,
};

// Cache object for simplified API
export const cache = {
  get: getCache,
  set: setCache,
  del: deleteCache,
  delPattern: deleteCachePattern,
  deletePattern: deleteCachePattern,
  has: hasCache,
  ttl: getCacheTTL,
  aside: cacheAside,
  refresh: refreshCache,
  invalidateTenant: invalidateTenantCache,
  keys: cacheKeys,
  patterns: cachePatterns,
  TTL: cacheTTL,
  getStats: () => ({ ...cacheStats }),
  resetStats: () => {
    cacheStats = { hits: 0, misses: 0, sets: 0, deletes: 0, errors: 0 };
  },
};

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default getRedis;
