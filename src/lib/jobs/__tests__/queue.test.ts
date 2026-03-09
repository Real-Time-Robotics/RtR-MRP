import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

import {
  queues,
  queueEvents,
  jobs,
  getJobStatus,
  getQueueStats,
  getAllQueueStats,
  closeAllQueues,
  type MRPJobData,
  type ReportJobData,
  type NotificationJobData,
  type ExportJobData,
  type ImportJobData,
  type EmailJobData,
  type ScheduledTaskData,
} from '../queue';

describe('queue - InMemoryQueue', () => {
  describe('queues', () => {
    it('should have all named queues', () => {
      expect(queues.mrp).toBeDefined();
      expect(queues.reports).toBeDefined();
      expect(queues.notifications).toBeDefined();
      expect(queues.exports).toBeDefined();
      expect(queues.imports).toBeDefined();
      expect(queues.emails).toBeDefined();
      expect(queues.scheduled).toBeDefined();
    });

    it('should have correct queue names', () => {
      expect(queues.mrp.name).toBe('mrp');
      expect(queues.reports.name).toBe('reports');
      expect(queues.notifications.name).toBe('notifications');
    });
  });

  describe('InMemoryQueue.add', () => {
    it('should add a job and return it', async () => {
      const job = await queues.mrp.add('test-job', {
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
      } as MRPJobData);

      expect(job.id).toBeDefined();
      expect(job.name).toBe('test-job');
      expect(job.status).toBe('waiting');
      expect(job.attemptsMade).toBe(0);
      expect(job.progress).toBe(0);
    });

    it('should use custom jobId when provided', async () => {
      const job = await queues.reports.add('test', {} as ReportJobData, { jobId: 'custom-id' });
      expect(job.id).toBe('custom-id');
    });

    it('should auto-increment IDs when no jobId provided', async () => {
      const job1 = await queues.notifications.add('n1', {} as NotificationJobData);
      const job2 = await queues.notifications.add('n2', {} as NotificationJobData);
      expect(job1.id).not.toBe(job2.id);
    });
  });

  describe('InMemoryQueue.addBulk', () => {
    it('should add multiple jobs', async () => {
      const added = await queues.emails.addBulk([
        { name: 'email-1', data: {} as EmailJobData },
        { name: 'email-2', data: {} as EmailJobData },
      ]);
      expect(added).toHaveLength(2);
      expect(added[0].name).toBe('email-1');
      expect(added[1].name).toBe('email-2');
    });
  });

  describe('InMemoryQueue.getJob', () => {
    it('should return a job by id', async () => {
      const added = await queues.exports.add('export-test', {} as ExportJobData, { jobId: 'find-me' });
      const found = await queues.exports.getJob('find-me');
      expect(found).not.toBeNull();
      expect(found!.name).toBe('export-test');
    });

    it('should return null for non-existent job', async () => {
      const found = await queues.exports.getJob('does-not-exist');
      expect(found).toBeNull();
    });
  });

  describe('InMemoryQueue count methods', () => {
    it('should count waiting jobs', async () => {
      // Add a few jobs to a fresh queue
      await queues.scheduled.add('count-test-1', {} as ScheduledTaskData);
      await queues.scheduled.add('count-test-2', {} as ScheduledTaskData);
      const count = await queues.scheduled.getWaitingCount();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('should return 0 for active count on fresh queue', async () => {
      const count = await queues.imports.getActiveCount();
      expect(count).toBe(0);
    });

    it('should return counts from getCompletedCount, getFailedCount, getDelayedCount', async () => {
      expect(await queues.imports.getCompletedCount()).toBe(0);
      expect(await queues.imports.getFailedCount()).toBe(0);
      expect(await queues.imports.getDelayedCount()).toBe(0);
    });
  });

  describe('InMemoryQueue.close', () => {
    it('should resolve without error', async () => {
      await expect(queues.mrp.close()).resolves.toBeUndefined();
    });
  });
});

describe('queue - job creators', () => {
  describe('jobs.mrp', () => {
    it('should add an MRP run job', async () => {
      const job = await jobs.mrp.run({
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
      });
      expect(job.name).toBe('run-mrp');
      expect(job.id).toContain('mrp-t1');
    });

    it('should schedule a recurring MRP job', async () => {
      const job = await jobs.mrp.scheduleRecurring('t1', '0 0 * * *');
      expect(job.name).toBe('scheduled-mrp');
    });
  });

  describe('jobs.reports', () => {
    it('should generate a report job', async () => {
      const job = await jobs.reports.generate({
        tenantId: 't1',
        userId: 'u1',
        reportType: 'inventory',
        reportName: 'Test Report',
        parameters: {},
        format: 'csv',
      });
      expect(job.name).toBe('generate-report');
      expect(job.id).toContain('report-t1-inventory');
    });

    it('should schedule a recurring report', async () => {
      const job = await jobs.reports.scheduleRecurring(
        {
          tenantId: 't1',
          userId: 'u1',
          reportType: 'sales',
          reportName: 'Weekly Sales',
          parameters: {},
          format: 'pdf',
        },
        '0 8 * * MON'
      );
      expect(job.name).toBe('scheduled-report');
    });
  });

  describe('jobs.notifications', () => {
    it('should send a notification', async () => {
      const job = await jobs.notifications.send({
        tenantId: 't1',
        type: 'info',
        title: 'Test',
        message: 'Hello',
        channels: ['app'],
      });
      expect(job.name).toBe('send-notification');
    });

    it('should send bulk notifications', async () => {
      const result = await jobs.notifications.sendBulk([
        { tenantId: 't1', type: 'info', title: 'A', message: 'B', channels: ['app'] },
        { tenantId: 't1', type: 'warning', title: 'C', message: 'D', channels: ['email'] },
      ]);
      expect(result).toHaveLength(2);
    });

    it('should send low stock alert', async () => {
      const job = await jobs.notifications.lowStockAlert('t1', [
        { partId: 'p1', partNumber: 'PN-001', quantity: 5, minStock: 20 },
      ]);
      expect(job.name).toBe('low-stock-alert');
      expect(job.data.type).toBe('warning');
      expect(job.data.title).toBe('Low stock alert');
    });
  });

  describe('jobs.exports', () => {
    it('should create an export job', async () => {
      const job = await jobs.exports.create({
        tenantId: 't1',
        userId: 'u1',
        exportType: 'parts',
        format: 'excel',
      });
      expect(job.name).toBe('export-data');
      expect(job.id).toContain('export-t1-parts');
    });
  });

  describe('jobs.imports', () => {
    it('should create an import job', async () => {
      const job = await jobs.imports.create({
        tenantId: 't1',
        userId: 'u1',
        importType: 'parts',
        fileKey: 'file-123',
        fileName: 'parts.xlsx',
        options: { updateExisting: true, skipErrors: false, dryRun: false },
      });
      expect(job.name).toBe('import-data');
    });
  });

  describe('jobs.emails', () => {
    it('should send an email', async () => {
      const job = await jobs.emails.send({
        tenantId: 't1',
        to: 'test@example.com',
        subject: 'Test',
        template: 'welcome',
        data: {},
      });
      expect(job.name).toBe('send-email');
    });

    it('should send bulk emails', async () => {
      const result = await jobs.emails.sendBulk([
        { tenantId: 't1', to: 'a@b.com', subject: 'A', template: 't', data: {} },
        { tenantId: 't1', to: 'c@d.com', subject: 'B', template: 't', data: {} },
      ]);
      expect(result).toHaveLength(2);
    });
  });

  describe('jobs.scheduled', () => {
    it('should create a backup job', async () => {
      const job = await jobs.scheduled.backup('t1');
      expect(job.name).toBe('backup');
      expect(job.data.taskType).toBe('backup');
    });

    it('should create a cleanup job', async () => {
      const job = await jobs.scheduled.cleanup('t1');
      expect(job.name).toBe('cleanup');
    });

    it('should create an alert-check job', async () => {
      const job = await jobs.scheduled.alertCheck('t1');
      expect(job.name).toBe('alert-check');
    });
  });
});

describe('queue - status helpers', () => {
  describe('getJobStatus', () => {
    it('should return job status for existing job', async () => {
      const added = await queues.mrp.add('status-test', {
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
      } as MRPJobData, { jobId: 'status-test-id' });

      const status = await getJobStatus('mrp', 'status-test-id');
      expect(status).not.toBeNull();
      expect(status!.id).toBe('status-test-id');
      expect(status!.name).toBe('status-test');
      expect(status!.state).toBe('waiting');
      expect(status!.progress).toBe(0);
    });

    it('should return null for non-existent job', async () => {
      const status = await getJobStatus('mrp', 'nonexistent');
      expect(status).toBeNull();
    });
  });

  describe('getQueueStats', () => {
    it('should return stats with correct shape', async () => {
      const stats = await getQueueStats('mrp');
      expect(stats).toHaveProperty('waiting');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('delayed');
    });
  });

  describe('getAllQueueStats', () => {
    it('should return stats for all queues', async () => {
      const allStats = await getAllQueueStats();
      expect(allStats).toHaveProperty('mrp');
      expect(allStats).toHaveProperty('reports');
      expect(allStats).toHaveProperty('notifications');
      expect(allStats).toHaveProperty('exports');
      expect(allStats).toHaveProperty('imports');
      expect(allStats).toHaveProperty('emails');
      expect(allStats).toHaveProperty('scheduled');
    });
  });

  describe('closeAllQueues', () => {
    it('should close all queues and events without error', async () => {
      await expect(closeAllQueues()).resolves.toBeUndefined();
    });
  });
});

describe('queue - queueEvents', () => {
  it('should have close methods for all queue events', async () => {
    for (const key of Object.keys(queueEvents)) {
      const event = queueEvents[key as keyof typeof queueEvents];
      expect(event.close).toBeDefined();
      await expect(event.close()).resolves.toBeUndefined();
    }
  });
});
