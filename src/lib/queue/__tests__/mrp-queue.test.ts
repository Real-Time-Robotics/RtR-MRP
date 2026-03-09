import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

import { mrpQueue, addMrpJob, MRP_QUEUE_NAME, type MrpJobData } from '../mrp.queue';

describe('MRP Queue', () => {
  const testJobData: MrpJobData = {
    planningHorizonDays: 30,
    includeConfirmed: true,
    includeDraft: false,
    includeSafetyStock: true,
    userId: 'user-1',
  };

  it('should export queue name', () => {
    expect(MRP_QUEUE_NAME).toBe('mrp-calculation-queue');
  });

  it('should add job to queue', async () => {
    const result = await mrpQueue.add('calculate-mrp', testJobData);
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.name).toBe('calculate-mrp');
    expect(result.data).toEqual(testJobData);
  });

  it('should get all jobs', async () => {
    const jobs = await mrpQueue.getJobs();
    expect(jobs.length).toBeGreaterThan(0);
  });

  it('should get jobs by status', async () => {
    const pendingJobs = await mrpQueue.getJobs(['pending']);
    expect(pendingJobs.length).toBeGreaterThan(0);
  });

  it('should get job by id', async () => {
    const added = await mrpQueue.add('test', testJobData);
    const job = await mrpQueue.getJob(added.id);
    expect(job).toBeDefined();
    expect(job!.data).toEqual(testJobData);
  });

  it('should close without error', async () => {
    await expect(mrpQueue.close()).resolves.not.toThrow();
  });

  it('should add MRP job via helper', async () => {
    const result = await addMrpJob(testJobData);
    expect(result).toBeDefined();
    expect(result.name).toBe('calculate-mrp');
  });
});
