// src/lib/cache/redis.ts
// Cache integration for RTR MRP System
// Uses in-memory cache by default, with optional Redis support

import { logger } from "@/lib/monitoring/logger";

// Simple in-memory cache implementation
class MemoryCache {
  private cache: Map<string, { value: string; expiry: number }> = new Map();
  private rateLimitData: Map<string, { timestamps: number[] }> = new Map();

  get(key: string): string | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  set(key: string, value: string, ttlSeconds: number): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  del(key: string): void {
    this.cache.delete(key);
  }

  delMultiple(keys: string[]): void {
    keys.forEach((key) => this.cache.delete(key));
  }

  keys(pattern: string): string[] {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    return Array.from(this.cache.keys()).filter((key) => regex.test(key));
  }

  // Rate limiting support
  addRateLimitEntry(key: string, timestamp: number, windowMs: number): number {
    const data = this.rateLimitData.get(key) || { timestamps: [] };
    const windowStart = timestamp - windowMs;

    // Remove old entries
    data.timestamps = data.timestamps.filter((ts) => ts > windowStart);

    // Add new entry
    data.timestamps.push(timestamp);
    this.rateLimitData.set(key, data);

    // Schedule cleanup
    setTimeout(() => {
      const current = this.rateLimitData.get(key);
      if (current && current.timestamps.length === 0) {
        this.rateLimitData.delete(key);
      }
    }, windowMs);

    return data.timestamps.length;
  }
}

// Singleton memory cache instance
const memoryCache = new MemoryCache();

// Redis client interface for type compatibility
interface RedisInterface {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<void>;
  del(...keys: string[]): Promise<void>;
  keys(pattern: string): Promise<string[]>;
  ping(): Promise<string>;
  multi(): RedisMulti;
}

interface RedisMulti {
  zremrangebyscore(key: string, min: number, max: number): RedisMulti;
  zadd(key: string, score: number, member: string): RedisMulti;
  zcard(key: string): RedisMulti;
  expire(key: string, seconds: number): RedisMulti;
  exec(): Promise<Array<[Error | null, unknown]> | null>;
}

// Memory-based implementation that matches Redis interface
class MemoryRedisAdapter implements RedisInterface {
  async ping(): Promise<string> {
    return "PONG";
  }

  async get(key: string): Promise<string | null> {
    return memoryCache.get(key);
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    memoryCache.set(key, value, seconds);
  }

  async del(...keys: string[]): Promise<void> {
    memoryCache.delMultiple(keys);
  }

  async keys(pattern: string): Promise<string[]> {
    return memoryCache.keys(pattern);
  }

  multi(): RedisMulti {
    // Simplified multi implementation for rate limiting with memory cache
    let currentKey = "";
    let windowMs = 60000;
    const multi: RedisMulti = {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      zremrangebyscore: (key: string, min: number, max: number) => {
        currentKey = key;
        return multi;
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      zadd: (key: string, score: number, member: string) => {
        currentKey = key;
        return multi;
      },
      zcard: (key: string) => {
        currentKey = key;
        return multi;
      },
      expire: (_key: string, seconds: number) => {
        windowMs = seconds * 1000;
        return multi;
      },
      exec: async () => {
        // For rate limiting, return the count
        const count = memoryCache.addRateLimitEntry(currentKey, Date.now(), windowMs);
        return [
          [null, 0], // zremrangebyscore
          [null, 1], // zadd
          [null, count], // zcard - this is the count we need
          [null, 1], // expire
        ];
      },
    };
    return multi;
  }
}

// Export the adapter
export const redis = new MemoryRedisAdapter();

// Log that we're using memory cache
if (typeof window === "undefined") {
  logger.info("Using in-memory cache (Redis optional)");
}

// Cache utilities
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds: number = 3600): Promise<void> {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      logger.error("Cache set error", error as Error);
    }
  },

  async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error("Cache delete error", error as Error);
    }
  },

  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error("Cache delete pattern error", error as Error);
    }
  },

  // Cache-aside pattern helper
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 3600
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, ttlSeconds);
    return value;
  },
};
