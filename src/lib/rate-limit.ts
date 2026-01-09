import { redis } from './redis';

interface RateLimitConfig {
    uniqueId: string;
    limit: number;
    windowSeconds: number;
}

interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
}

export class RateLimiter {
    /**
     * Check if the action is allowed for the given ID.
     * Uses a sliding window algorithm via Redis Lua script (or simple expiration).
     * For simplicity and robustness, we'll use a fixed window counter with expiration here.
     */
    static async check(config: RateLimitConfig): Promise<RateLimitResult> {
        const { uniqueId, limit, windowSeconds } = config;
        const key = `ratelimit:${uniqueId}`;

        // Pipelined command: Increment and Get TTL
        const pipeline = redis.pipeline();
        pipeline.incr(key);
        pipeline.ttl(key);

        const results = await pipeline.exec();

        if (!results) {
            throw new Error('Redis pipeline failed');
        }

        const countError = results[0][0];
        const count = results[0][1] as number;
        const ttlError = results[1][0];
        let ttl = results[1][1] as number;

        if (countError) throw countError;
        if (ttlError) throw ttlError;

        // If new key (count === 1), set expiration
        if (count === 1) {
            await redis.expire(key, windowSeconds);
            ttl = windowSeconds;
        }
        // If key exists but has no TTL (should rare), set it
        else if (ttl === -1) {
            await redis.expire(key, windowSeconds);
            ttl = windowSeconds;
        }

        const remaining = Math.max(0, limit - count);
        const reset = Math.floor(Date.now() / 1000) + (ttl > 0 ? ttl : windowSeconds);

        return {
            success: count <= limit,
            limit,
            remaining,
            reset,
        };
    }

    /**
     * Wraps the check in a standard response header format helper?
     * Usually consumer handles headers.
     */
}
