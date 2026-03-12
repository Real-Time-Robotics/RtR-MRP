// src/lib/monitoring/__tests__/health.test.ts
// Unit tests for health check utilities

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

// Mock os module
vi.mock('os', () => ({
  cpus: vi.fn(() => [{ model: 'cpu1' }, { model: 'cpu2' }]),
  loadavg: vi.fn(() => [0.5, 0.4, 0.3]),
}));

// Mock fs module
vi.mock('fs', () => ({
  statfsSync: vi.fn(() => ({
    blocks: 1000000,
    bsize: 4096,
    bfree: 500000,
  })),
}));

import { prisma } from '@/lib/prisma';
import * as os from 'os';
import * as fs from 'fs';
import {
  checkDatabase,
  checkRedis,
  checkStorage,
  checkMemory,
  checkCPU,
  checkDisk,
  checkLiveness,
  checkReadiness,
  checkHealth,
  getHealthHttpStatus,
} from '../health';
import type { HealthStatus } from '../health';

describe('Health Check Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // checkDatabase
  // ==========================================================================
  describe('checkDatabase', () => {
    it('should return pass when database is reachable', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }]);

      const result = await checkDatabase();

      expect(result.name).toBe('database');
      expect(result.status).toBe('pass');
      expect(result.message).toBe('PostgreSQL is reachable');
      expect(result.duration).toBeDefined();
    });

    it('should return fail when database is unreachable', async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Connection refused'));

      const result = await checkDatabase();

      expect(result.name).toBe('database');
      expect(result.status).toBe('fail');
      expect(result.message).toBe('Connection refused');
    });

    it('should return generic message for non-Error throws', async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue('string error');

      const result = await checkDatabase();

      expect(result.status).toBe('fail');
      expect(result.message).toBe('Database connection failed');
    });
  });

  // ==========================================================================
  // checkRedis
  // ==========================================================================
  describe('checkRedis', () => {
    it('should always return pass with in-memory cache message', async () => {
      const result = await checkRedis();

      expect(result.name).toBe('redis');
      expect(result.status).toBe('pass');
      expect(result.message).toContain('in-memory cache');
      expect(result.details).toEqual({
        mode: 'in-memory',
        reason: 'Render free tier does not support Redis',
      });
    });
  });

  // ==========================================================================
  // checkStorage
  // ==========================================================================
  describe('checkStorage', () => {
    it('should return warn when S3 is not configured', async () => {
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.S3_BUCKET;

      const result = await checkStorage();

      expect(result.name).toBe('storage');
      expect(result.status).toBe('warn');
      expect(result.message).toBe('S3 not configured');
    });

    it('should return warn with SDK not installed when S3 is configured', async () => {
      process.env.AWS_ACCESS_KEY_ID = 'test-key';
      process.env.S3_BUCKET = 'test-bucket';

      const result = await checkStorage();

      expect(result.name).toBe('storage');
      expect(result.status).toBe('warn');
      expect(result.message).toContain('S3 check skipped');

      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.S3_BUCKET;
    });
  });

  // ==========================================================================
  // checkMemory
  // ==========================================================================
  describe('checkMemory', () => {
    it('should return pass when heap usage is low', () => {
      vi.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 50 * 1024 * 1024,  // 50MB
        heapTotal: 200 * 1024 * 1024, // 200MB
        rss: 300 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      });

      const result = checkMemory();

      expect(result.name).toBe('memory');
      expect(result.status).toBe('pass');
      expect(result.message).toContain('Heap:');
      expect(result.details).toBeDefined();
    });

    it('should return warn when heap usage > 80%', () => {
      vi.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 170 * 1024 * 1024,  // 170MB
        heapTotal: 200 * 1024 * 1024,  // 200MB = 85%
        rss: 300 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      });

      const result = checkMemory();

      expect(result.status).toBe('warn');
    });

    it('should return fail when heap usage > 90%', () => {
      vi.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 190 * 1024 * 1024,  // 190MB
        heapTotal: 200 * 1024 * 1024,  // 200MB = 95%
        rss: 300 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      });

      const result = checkMemory();

      expect(result.status).toBe('fail');
    });
  });

  // ==========================================================================
  // checkCPU
  // ==========================================================================
  describe('checkCPU', () => {
    it('should return pass when load is low', () => {
      vi.mocked(os.loadavg).mockReturnValue([0.5, 0.4, 0.3]);
      vi.mocked(os.cpus).mockReturnValue([
        { model: 'cpu1' } as os.CpuInfo,
        { model: 'cpu2' } as os.CpuInfo,
      ]);

      const result = checkCPU();

      expect(result.name).toBe('cpu');
      expect(result.status).toBe('pass');
      expect(result.message).toContain('Load:');
      expect(result.details?.normalizedLoad).toBe(0.25); // 0.5 / 2
    });

    it('should return warn when normalized load > 0.7', () => {
      vi.mocked(os.loadavg).mockReturnValue([1.6, 1.0, 0.8]);
      vi.mocked(os.cpus).mockReturnValue([
        { model: 'cpu1' } as os.CpuInfo,
        { model: 'cpu2' } as os.CpuInfo,
      ]);

      const result = checkCPU();

      expect(result.status).toBe('warn');
    });

    it('should return fail when normalized load > 0.9', () => {
      vi.mocked(os.loadavg).mockReturnValue([2.0, 1.5, 1.0]);
      vi.mocked(os.cpus).mockReturnValue([
        { model: 'cpu1' } as os.CpuInfo,
        { model: 'cpu2' } as os.CpuInfo,
      ]);

      const result = checkCPU();

      expect(result.status).toBe('fail');
    });
  });

  // ==========================================================================
  // checkDisk
  // ==========================================================================
  describe('checkDisk', () => {
    it('should return pass when disk usage is normal', () => {
      vi.mocked(fs.statfsSync).mockReturnValue({
        blocks: 1000000,
        bsize: 4096,
        bfree: 500000, // 50% free
      } as unknown as ReturnType<typeof fs.statfsSync>);

      const result = checkDisk();

      expect(result.name).toBe('disk');
      expect(result.status).toBe('pass');
    });

    it('should return warn when unable to check disk', () => {
      vi.mocked(fs.statfsSync).mockImplementation(() => {
        throw new Error('Not supported');
      });

      const result = checkDisk();

      expect(result.name).toBe('disk');
      expect(result.status).toBe('warn');
      expect(result.message).toBe('Unable to check disk usage');
    });
  });

  // ==========================================================================
  // checkLiveness
  // ==========================================================================
  describe('checkLiveness', () => {
    it('should always return healthy status', () => {
      const result = checkLiveness();

      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
      expect(result.version).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.checks).toEqual([]);
    });
  });

  // ==========================================================================
  // checkReadiness
  // ==========================================================================
  describe('checkReadiness', () => {
    it('should return healthy when all checks pass', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }]);
      vi.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 200 * 1024 * 1024,
        rss: 300 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      });

      const result = await checkReadiness();

      // Redis always returns pass with in-memory, but message says "in-memory cache"
      // which means it is 'pass', so no warning from redis
      // Overall: pass from db, pass from redis, pass from memory => healthy or degraded
      // Actually redis returns 'pass', not 'warn', so should be healthy
      expect(result.status).toBe('healthy');
      expect(result.checks.length).toBe(3); // database, redis, memory
    });

    it('should return unhealthy when database fails', async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('down'));
      vi.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 200 * 1024 * 1024,
        rss: 300 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      });

      const result = await checkReadiness();

      expect(result.status).toBe('unhealthy');
    });
  });

  // ==========================================================================
  // checkHealth
  // ==========================================================================
  describe('checkHealth', () => {
    it('should run all checks', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }]);
      vi.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 200 * 1024 * 1024,
        rss: 300 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      });
      vi.mocked(os.loadavg).mockReturnValue([0.5, 0.4, 0.3]);
      vi.mocked(os.cpus).mockReturnValue([
        { model: 'cpu1' } as os.CpuInfo,
        { model: 'cpu2' } as os.CpuInfo,
      ]);
      vi.mocked(fs.statfsSync).mockReturnValue({
        blocks: 1000000,
        bsize: 4096,
        bfree: 500000,
      } as unknown as ReturnType<typeof fs.statfsSync>);

      // S3 not configured so storage returns warn
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.S3_BUCKET;

      const result = await checkHealth();

      expect(result.checks.length).toBe(6);
      // Storage check returns 'warn', so status should be 'degraded'
      expect(result.status).toBe('degraded');
      expect(result.version).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // getHealthHttpStatus
  // ==========================================================================
  describe('getHealthHttpStatus', () => {
    it('should return 200 for healthy', () => {
      const status = getHealthHttpStatus({ status: 'healthy' } as HealthStatus);
      expect(status).toBe(200);
    });

    it('should return 200 for degraded', () => {
      const status = getHealthHttpStatus({ status: 'degraded' } as HealthStatus);
      expect(status).toBe(200);
    });

    it('should return 503 for unhealthy', () => {
      const status = getHealthHttpStatus({ status: 'unhealthy' } as HealthStatus);
      expect(status).toBe(503);
    });

    it('should return 500 for unknown status', () => {
      const status = getHealthHttpStatus({ status: 'unknown' as 'healthy' } as HealthStatus);
      expect(status).toBe(500);
    });
  });
});
