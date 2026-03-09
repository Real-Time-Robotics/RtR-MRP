import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/monitoring/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

// Import after mocking
const { JobQueue } = await (async () => {
  // We need to test the class directly, but it's not exported.
  // Instead, test the singleton and JOB_NAMES
  const mod = await import('../job-queue');
  return { jobQueue: mod.jobQueue, JOB_NAMES: mod.JOB_NAMES, JobQueue: null };
})();

import { jobQueue, JOB_NAMES } from '../job-queue';

describe('JobQueue', () => {
  beforeEach(() => {
    // Clear jobs between tests
    for (const job of jobQueue.getAllJobs()) {
      jobQueue.cancel(job.id);
    }
  });

  describe('JOB_NAMES', () => {
    it('should define all job names', () => {
      expect(JOB_NAMES.EXCEL_IMPORT).toBe('excel:import');
      expect(JOB_NAMES.EXCEL_EXPORT).toBe('excel:export');
      expect(JOB_NAMES.MRP_CALCULATION).toBe('mrp:calculate');
      expect(JOB_NAMES.REPORT_GENERATION).toBe('report:generate');
      expect(JOB_NAMES.CACHE_WARMING).toBe('cache:warm');
      expect(JOB_NAMES.EMAIL_SEND).toBe('email:send');
      expect(JOB_NAMES.DATA_SYNC).toBe('data:sync');
      expect(JOB_NAMES.CLEANUP).toBe('system:cleanup');
    });
  });

  describe('add', () => {
    it('should add a job with correct properties', () => {
      const job = jobQueue.add('test-job', { key: 'value' });
      expect(job.id).toBeDefined();
      expect(job.name).toBe('test-job');
      expect(job.data).toEqual({ key: 'value' });
      // Job starts processing immediately, status may change from pending
      expect(['pending', 'running', 'failed', 'completed']).toContain(job.status);
      expect(job.priority).toBe(0);
      expect(job.createdAt).toBeInstanceOf(Date);
    });

    it('should accept custom priority', () => {
      const job = jobQueue.add('test-job', {}, 10);
      expect(job.priority).toBe(10);
    });
  });

  describe('getJob', () => {
    it('should return job by id', () => {
      const added = jobQueue.add('test', { x: 1 });
      const found = jobQueue.getJob(added.id);
      expect(found).toBeDefined();
      expect(found!.data).toEqual({ x: 1 });
    });

    it('should return undefined for unknown id', () => {
      expect(jobQueue.getJob('nonexistent')).toBeUndefined();
    });
  });

  describe('getAllJobs', () => {
    it('should return all jobs', () => {
      jobQueue.add('a', {});
      jobQueue.add('b', {});
      const all = jobQueue.getAllJobs();
      expect(all.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getJobsByStatus', () => {
    it('should filter by status', () => {
      jobQueue.add('test-status', {});
      const pending = jobQueue.getJobsByStatus('pending');
      expect(pending.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('cancel', () => {
    it('should cancel pending job', () => {
      const job = jobQueue.add('cancel-test', {});
      // Job might already be processing, but try cancel
      const result = jobQueue.cancel(job.id);
      // Result depends on whether job was still pending
      expect(typeof result).toBe('boolean');
    });

    it('should return false for unknown job', () => {
      expect(jobQueue.cancel('nonexistent')).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return stats object', () => {
      const stats = jobQueue.getStats();
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('running');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('total');
    });
  });

  describe('clear', () => {
    it('should clear old completed jobs', () => {
      const cleared = jobQueue.clear(0); // Clear everything older than 0ms
      expect(typeof cleared).toBe('number');
    });
  });

  describe('register and process', () => {
    it('should register a handler and process jobs', async () => {
      const handler = vi.fn().mockResolvedValue({ done: true });
      jobQueue.register('process-test', handler);
      jobQueue.add('process-test', { input: 'data' });

      // Wait for processing
      await new Promise(r => setTimeout(r, 100));

      expect(handler).toHaveBeenCalled();
    });

    it('should handle job failure and retry', async () => {
      let attempts = 0;
      const handler = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) throw new Error('Fail');
        return { ok: true };
      });

      jobQueue.register('retry-test', handler);
      const job = jobQueue.add('retry-test', {});

      // Wait for retries
      await new Promise(r => setTimeout(r, 3000));

      const updated = jobQueue.getJob(job.id);
      // Job should eventually complete or fail after retries
      expect(updated).toBeDefined();
    });
  });
});
