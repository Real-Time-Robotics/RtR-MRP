/**
 * Queue unit tests — covers both in-memory mode and BullMQ mode via mocks.
 *
 * In-memory mode is exercised by leaving REDIS_URL unset (default).
 * BullMQ mode is exercised by mocking ../connection and bullmq primitives.
 *
 * Contract under test: `queues.*.add()` returns `{id, name, data}` regardless
 * of mode; `jobs.*` helpers enqueue with the expected job names; status and
 * stats helpers work end-to-end.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

// =============================================================================
// In-memory mode tests (REDIS_URL absent → isInMemoryMode()=true by default)
// =============================================================================

import {
  queues,
  queueEvents,
  jobs,
  getJobStatus,
  getQueueStats,
  getAllQueueStats,
  QUEUE_NAMES,
  type MRPJobData,
  type ReportJobData,
  type NotificationJobData,
  type ExportJobData,
  type EmailJobData,
  type ScheduledTaskData,
} from '../queue';

describe('queue (in-memory mode)', () => {
  it('exposes the full queue roster under canonical queue names', () => {
    expect(queues.mrp.name).toBe(QUEUE_NAMES.MRP);
    expect(queues.reports.name).toBe(QUEUE_NAMES.REPORTS);
    expect(queues.notifications.name).toBe(QUEUE_NAMES.NOTIFICATIONS);
    expect(queues.exports.name).toBe(QUEUE_NAMES.EXPORTS);
    expect(queues.imports.name).toBe(QUEUE_NAMES.IMPORTS);
    expect(queues.emails.name).toBe(QUEUE_NAMES.EMAILS);
    expect(queues.scheduled.name).toBe(QUEUE_NAMES.SCHEDULED);
  });

  it('add() returns {id, name, data} with a custom jobId when supplied', async () => {
    const job = await queues.reports.add(
      'generate-report',
      {} as ReportJobData,
      { jobId: 'custom-id-1' }
    );
    expect(job).not.toBeNull();
    expect(job!.id).toBe('custom-id-1');
    expect(job!.name).toBe('generate-report');
  });

  it('add() auto-generates unique ids when no jobId is supplied', async () => {
    const a = await queues.notifications.add('send', {} as NotificationJobData);
    const b = await queues.notifications.add('send', {} as NotificationJobData);
    expect(a!.id).not.toEqual(b!.id);
  });

  it('addBulk() enqueues multiple jobs preserving names', async () => {
    const added = await queues.emails.addBulk([
      { name: 'email-1', data: {} as EmailJobData },
      { name: 'email-2', data: {} as EmailJobData },
    ]);
    expect(added).toHaveLength(2);
    expect(added[0]!.name).toBe('email-1');
    expect(added[1]!.name).toBe('email-2');
  });

  it('jobs.mrp.run enqueues a run-mrp job with tenant-scoped id', async () => {
    const data: MRPJobData = {
      tenantId: 't1',
      userId: 'u1',
      options: {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        includeDemand: true,
        includeSupply: true,
        includeWIP: true,
        planningHorizon: 30,
      },
    };
    const job = await jobs.mrp.run(data);
    expect(job!.name).toBe('run-mrp');
    expect(job!.id).toContain('mrp-t1');
  });

  it('jobs.notifications.lowStockAlert shapes the payload correctly', async () => {
    const job = await jobs.notifications.lowStockAlert('t1', [
      { partId: 'p1', partNumber: 'PN-001', quantity: 5, minStock: 20 },
    ]);
    expect(job!.name).toBe('low-stock-alert');
    expect((job!.data as NotificationJobData).type).toBe('warning');
    expect((job!.data as NotificationJobData).title).toBe('Low stock alert');
  });

  it('jobs.exports.create tags the job id with export type', async () => {
    const job = await jobs.exports.create({
      tenantId: 't1',
      userId: 'u1',
      exportType: 'parts',
      format: 'excel',
    } as ExportJobData);
    expect(job!.id).toContain('export-t1-parts');
  });

  it('jobs.scheduled emits backup/cleanup/alert-check with matching taskType', async () => {
    const backup = await jobs.scheduled.backup('t1');
    const cleanup = await jobs.scheduled.cleanup('t1');
    const alert = await jobs.scheduled.alertCheck('t1');
    expect((backup!.data as ScheduledTaskData).taskType).toBe('backup');
    expect((cleanup!.data as ScheduledTaskData).taskType).toBe('cleanup');
    expect((alert!.data as ScheduledTaskData).taskType).toBe('alert-check');
  });

  it('getJobStatus returns normalized status for a waiting in-memory job', async () => {
    await queues.mrp.add(
      'status-test',
      {
        tenantId: 't1',
        userId: 'u1',
        options: {
          startDate: '2026-01-01',
          endDate: '2026-01-31',
          includeDemand: true,
          includeSupply: true,
          includeWIP: true,
          planningHorizon: 30,
        },
      } as MRPJobData,
      { jobId: 'status-1' }
    );
    const status = await getJobStatus('mrp', 'status-1');
    expect(status).not.toBeNull();
    expect(status!.id).toBe('status-1');
    expect(status!.name).toBe('status-test');
    expect(status!.state).toBe('waiting');
  });

  it('getJobStatus returns null for a job that does not exist', async () => {
    expect(await getJobStatus('mrp', 'missing')).toBeNull();
  });

  it('getQueueStats returns the 5-bucket shape', async () => {
    const stats = await getQueueStats('reports');
    expect(stats).toEqual(
      expect.objectContaining({
        waiting: expect.any(Number),
        active: expect.any(Number),
        completed: expect.any(Number),
        failed: expect.any(Number),
        delayed: expect.any(Number),
      })
    );
  });

  it('getAllQueueStats returns stats for every registered queue', async () => {
    const all = await getAllQueueStats();
    for (const key of Object.keys(queues)) {
      expect(all).toHaveProperty(key);
    }
  });

  it('queueEvents exposes close() on every queue (no-op in in-memory mode)', async () => {
    for (const key of Object.keys(queueEvents)) {
      const ev = queueEvents[key as keyof typeof queueEvents];
      expect(typeof ev.close).toBe('function');
      await expect(ev.close()).resolves.toBeUndefined();
    }
  });
});

// =============================================================================
// BullMQ mode tests — re-import queue.ts with mocked connection/bullmq.
// =============================================================================

describe('queue (BullMQ mode)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('delegates add() to bullmq.Queue.add with attempts+backoff+removeOn* defaults', async () => {
    const mockBullAdd = vi.fn().mockImplementation(
      async (name: string, data: unknown) => ({ id: 'bull-1', name, data })
    );
    vi.doMock('bullmq', () => {
      class Queue {
        public name: string;
        constructor(name: string) {
          this.name = name;
        }
        add = mockBullAdd;
        close = vi.fn().mockResolvedValue(undefined);
        getJob = vi.fn();
        getWaitingCount = vi.fn().mockResolvedValue(0);
        getActiveCount = vi.fn().mockResolvedValue(0);
        getCompletedCount = vi.fn().mockResolvedValue(0);
        getFailedCount = vi.fn().mockResolvedValue(0);
        getDelayedCount = vi.fn().mockResolvedValue(0);
      }
      class QueueEvents {
        close = vi.fn().mockResolvedValue(undefined);
      }
      class Worker {}
      return { Queue, QueueEvents, Worker };
    });
    vi.doMock('../connection', () => ({
      isInMemoryMode: vi.fn(() => false),
      getBullConnection: vi.fn(() => ({ fake: 'conn' })),
      closeBullConnection: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('@/lib/logger', () => ({
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
    }));

    const mod = await import('../queue');
    const out = await mod.jobs.notifications.send({
      tenantId: 't1',
      userId: 'u1',
      type: 'info',
      title: 'hi',
      message: 'hello',
      channels: ['app'],
    });

    expect(out!.id).toBe('bull-1');
    expect(mockBullAdd).toHaveBeenCalledTimes(1);
    const [jobName, data, opts] = mockBullAdd.mock.calls[0];
    expect(jobName).toBe('send-notification');
    expect(data).toMatchObject({ title: 'hi' });
    expect(opts).toMatchObject({
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: expect.any(Object),
      removeOnFail: expect.any(Object),
    });
  });

  it('closeAllQueues closes bullmq queues + queue events + the Redis connection', async () => {
    const closeQueue = vi.fn().mockResolvedValue(undefined);
    const closeEvents = vi.fn().mockResolvedValue(undefined);
    const closeConn = vi.fn().mockResolvedValue(undefined);

    vi.doMock('bullmq', () => {
      class Queue {
        public name: string;
        constructor(name: string) {
          this.name = name;
        }
        add = vi.fn();
        close = closeQueue;
        getJob = vi.fn();
        getWaitingCount = vi.fn().mockResolvedValue(0);
        getActiveCount = vi.fn().mockResolvedValue(0);
        getCompletedCount = vi.fn().mockResolvedValue(0);
        getFailedCount = vi.fn().mockResolvedValue(0);
        getDelayedCount = vi.fn().mockResolvedValue(0);
      }
      class QueueEvents {
        close = closeEvents;
      }
      class Worker {}
      return { Queue, QueueEvents, Worker };
    });
    vi.doMock('../connection', () => ({
      isInMemoryMode: vi.fn(() => false),
      getBullConnection: vi.fn(() => ({ fake: 'conn' })),
      closeBullConnection: closeConn,
    }));
    vi.doMock('@/lib/logger', () => ({
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
    }));

    const mod = await import('../queue');
    await mod.closeAllQueues();

    // 7 queues × close + 7 queueEvents × close + 1 connection close
    expect(closeQueue).toHaveBeenCalledTimes(7);
    expect(closeEvents).toHaveBeenCalledTimes(7);
    expect(closeConn).toHaveBeenCalledTimes(1);
  });
});
