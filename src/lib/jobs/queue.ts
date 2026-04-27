// =============================================================================
// RTR MRP - BACKGROUND JOBS
// BullMQ when REDIS_URL is set, in-memory fallback otherwise.
// Public API (queues.*, jobs.*, getJobStatus, getQueueStats, closeAllQueues)
// is stable across both modes so callers don't branch.
// =============================================================================

import { Queue, QueueEvents, type JobsOptions } from 'bullmq';
import { logger } from '@/lib/logger';
import { getBullConnection, isInMemoryMode, closeBullConnection } from './connection';

// =============================================================================
// JOB DATA TYPES
// =============================================================================

export interface MRPJobData {
  tenantId: string;
  userId: string;
  runId?: string;
  options: {
    startDate: string;
    endDate: string;
    includeDemand: boolean;
    includeSupply: boolean;
    includeWIP: boolean;
    planningHorizon: number;
  };
}

export interface ReportJobData {
  tenantId: string;
  userId: string;
  reportType: 'inventory' | 'sales' | 'production' | 'quality' | 'mrp' | 'custom';
  reportName: string;
  parameters: Record<string, unknown>;
  format: 'pdf' | 'excel' | 'csv';
  emailTo?: string[];
}

export interface NotificationJobData {
  tenantId: string;
  userId?: string;
  userIds?: string[];
  type: 'info' | 'success' | 'warning' | 'error' | 'alert';
  title: string;
  message: string;
  link?: string;
  data?: Record<string, unknown>;
  channels: ('app' | 'email' | 'push')[];
}

export interface ExportJobData {
  tenantId: string;
  userId: string;
  exportType: 'parts' | 'inventory' | 'orders' | 'workorders' | 'all';
  format: 'excel' | 'csv' | 'json';
  filters?: Record<string, unknown>;
  emailWhenDone?: boolean;
}

export interface ImportJobData {
  tenantId: string;
  userId: string;
  importType: 'parts' | 'inventory' | 'orders' | 'bom';
  fileKey: string;
  fileName: string;
  options: {
    updateExisting: boolean;
    skipErrors: boolean;
    dryRun: boolean;
  };
}

export interface EmailJobData {
  tenantId: string;
  to: string | string[];
  subject: string;
  template: string;
  data: Record<string, unknown>;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
  }>;
}

export interface ScheduledTaskData {
  tenantId: string;
  taskType: 'backup' | 'cleanup' | 'sync' | 'alert-check' | 'usage-report';
  parameters?: Record<string, unknown>;
}

// =============================================================================
// UNIFIED QUEUE INTERFACE
// =============================================================================

/**
 * Minimal shape we expose — a narrow subset of BullMQ's Queue so the in-memory
 * fallback can implement the same contract.
 */
export interface IQueue<T = unknown> {
  readonly name: string;
  add(
    jobName: string,
    data: T,
    opts?: { jobId?: string; priority?: number; delay?: number }
  ): Promise<{ id: string; name: string; data: T } | null>;
  addBulk(
    jobsData: Array<{ name: string; data: T; opts?: JobsOptions }>
  ): Promise<Array<{ id: string; name: string; data: T } | null>>;
  getJob(id: string): Promise<unknown>;
  getWaitingCount(): Promise<number>;
  getActiveCount(): Promise<number>;
  getCompletedCount(): Promise<number>;
  getFailedCount(): Promise<number>;
  getDelayedCount(): Promise<number>;
  close(): Promise<void>;
}

// =============================================================================
// IN-MEMORY QUEUE IMPLEMENTATION (dev / fallback)
// =============================================================================

interface QueuedJob<T = unknown> {
  id: string;
  name: string;
  data: T;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  createdAt: Date;
  processedOn?: Date;
  finishedOn?: Date;
  failedReason?: string;
  returnvalue?: unknown;
  attemptsMade: number;
  progress: number;
}

class InMemoryQueue<T = unknown> implements IQueue<T> {
  private jobs: Map<string, QueuedJob<T>> = new Map();
  private jobCounter = 0;
  public name: string;

  constructor(name: string) {
    this.name = name;
  }

  async add(jobName: string, data: T, opts?: { jobId?: string; priority?: number }) {
    const id = opts?.jobId || `${this.name}-${++this.jobCounter}`;
    const job: QueuedJob<T> = {
      id,
      name: jobName,
      data,
      status: 'waiting',
      createdAt: new Date(),
      attemptsMade: 0,
      progress: 0,
    };
    this.jobs.set(id, job);
    logger.info(`[Queue:${this.name}] Job ${id} added (in-memory mode)`);
    return { id, name: jobName, data };
  }

  async addBulk(jobsData: Array<{ name: string; data: T; opts?: JobsOptions }>) {
    return Promise.all(jobsData.map((j) => this.add(j.name, j.data)));
  }

  async getJob(id: string) {
    return this.jobs.get(id) || null;
  }

  async getWaitingCount() {
    return Array.from(this.jobs.values()).filter((j) => j.status === 'waiting').length;
  }

  async getActiveCount() {
    return Array.from(this.jobs.values()).filter((j) => j.status === 'active').length;
  }

  async getCompletedCount() {
    return Array.from(this.jobs.values()).filter((j) => j.status === 'completed').length;
  }

  async getFailedCount() {
    return Array.from(this.jobs.values()).filter((j) => j.status === 'failed').length;
  }

  async getDelayedCount() {
    return Array.from(this.jobs.values()).filter((j) => j.status === 'delayed').length;
  }

  async close() {
    this.jobs.clear();
  }
}

// =============================================================================
// BULLMQ QUEUE ADAPTER
// =============================================================================

/**
 * Thin wrapper that adapts BullMQ's Queue to the IQueue interface. The wrapper
 * only normalises return shapes; BullMQ already does the heavy lifting.
 */
class BullMQQueueAdapter<T = unknown> implements IQueue<T> {
  public readonly name: string;
  private readonly queue: Queue<T>;

  constructor(name: string, queue: Queue<T>) {
    this.name = name;
    this.queue = queue;
  }

  /** Expose underlying BullMQ queue for advanced callers (workers, events). */
  getBullQueue(): Queue<T> {
    return this.queue;
  }

  async add(
    jobName: string,
    data: T,
    opts?: { jobId?: string; priority?: number; delay?: number }
  ) {
    const jobOpts: JobsOptions = {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 86400 },
      ...(opts?.jobId ? { jobId: opts.jobId } : {}),
      ...(opts?.priority ? { priority: opts.priority } : {}),
      ...(opts?.delay ? { delay: opts.delay } : {}),
    };
    // BullMQ 5's `Queue.add` has a heavily-branded NameType generic
    // (ExtractNameType<T, string>). For us NameType is just `string` — cast
    // through `any` to avoid propagating the branded generic through our
    // own IQueue<T> interface.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const job = await (this.queue as any).add(jobName, data, jobOpts);
    return { id: String(job.id), name: job.name as string, data: job.data as T };
  }

  async addBulk(jobsData: Array<{ name: string; data: T; opts?: JobsOptions }>) {
    const defaultOpts: JobsOptions = {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 86400 },
    };
    // See comment in `add()` — same branded-generic dance.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bulk = await (this.queue as any).addBulk(
      jobsData.map((j) => ({
        name: j.name,
        data: j.data,
        opts: { ...defaultOpts, ...(j.opts ?? {}) },
      }))
    );
    return bulk.map((job: { id?: string | number; name: string; data: T }) => ({
      id: String(job.id),
      name: job.name as string,
      data: job.data as T,
    }));
  }

  async getJob(id: string) {
    return this.queue.getJob(id);
  }

  async getWaitingCount() {
    return this.queue.getWaitingCount();
  }

  async getActiveCount() {
    return this.queue.getActiveCount();
  }

  async getCompletedCount() {
    return this.queue.getCompletedCount();
  }

  async getFailedCount() {
    return this.queue.getFailedCount();
  }

  async getDelayedCount() {
    return this.queue.getDelayedCount();
  }

  async close() {
    await this.queue.close();
  }
}

// =============================================================================
// QUEUE FACTORY
// =============================================================================

function makeQueue<T>(name: string): IQueue<T> {
  const connection = getBullConnection();
  if (!connection || isInMemoryMode()) {
    logger.info(`[Queue:${name}] in-memory mode`);
    return new InMemoryQueue<T>(name);
  }

  const q = new Queue<T>(name, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 86400 },
    },
  });
  logger.info(`[Queue:${name}] BullMQ mode (Redis)`);
  return new BullMQQueueAdapter<T>(name, q);
}

function makeQueueEvents(name: string): { close: () => Promise<void> } {
  const connection = getBullConnection();
  if (!connection || isInMemoryMode()) {
    return { close: async () => {} };
  }
  const qe = new QueueEvents(name, { connection });
  return { close: () => qe.close() };
}

// =============================================================================
// QUEUE INSTANCES
// =============================================================================

// Queue name constants — exported so workers import the same strings.
export const QUEUE_NAMES = {
  MRP: 'mrp-run',
  REPORTS: 'report-generate',
  NOTIFICATIONS: 'notification-send',
  EXPORTS: 'export-data',
  IMPORTS: 'import-data',
  EMAILS: 'send-email',
  SCHEDULED: 'scheduled-task',
} as const;

export const queues = {
  mrp: makeQueue<MRPJobData>(QUEUE_NAMES.MRP),
  reports: makeQueue<ReportJobData>(QUEUE_NAMES.REPORTS),
  notifications: makeQueue<NotificationJobData>(QUEUE_NAMES.NOTIFICATIONS),
  exports: makeQueue<ExportJobData>(QUEUE_NAMES.EXPORTS),
  imports: makeQueue<ImportJobData>(QUEUE_NAMES.IMPORTS),
  emails: makeQueue<EmailJobData>(QUEUE_NAMES.EMAILS),
  scheduled: makeQueue<ScheduledTaskData>(QUEUE_NAMES.SCHEDULED),
};

export const queueEvents = {
  mrp: makeQueueEvents(QUEUE_NAMES.MRP),
  reports: makeQueueEvents(QUEUE_NAMES.REPORTS),
  notifications: makeQueueEvents(QUEUE_NAMES.NOTIFICATIONS),
  exports: makeQueueEvents(QUEUE_NAMES.EXPORTS),
  imports: makeQueueEvents(QUEUE_NAMES.IMPORTS),
  emails: makeQueueEvents(QUEUE_NAMES.EMAILS),
  scheduled: makeQueueEvents(QUEUE_NAMES.SCHEDULED),
};

// =============================================================================
// JOB CREATORS
// =============================================================================

export const jobs = {
  mrp: {
    run: async (data: MRPJobData) => {
      return queues.mrp.add('run-mrp', data, {
        jobId: `mrp-${data.tenantId}-${Date.now()}`,
      });
    },
    scheduleRecurring: async (tenantId: string, _cronExpression: string) => {
      logger.info(`[Queue:mrp] Recurring scheduling via BullMQ repeatable jobs — not yet wired`);
      return queues.mrp.add('scheduled-mrp', {
        tenantId,
        userId: 'system',
        options: {
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          includeDemand: true,
          includeSupply: true,
          includeWIP: true,
          planningHorizon: 30,
        },
      });
    },
  },

  reports: {
    generate: async (data: ReportJobData) => {
      return queues.reports.add('generate-report', data, {
        jobId: `report-${data.tenantId}-${data.reportType}-${Date.now()}`,
      });
    },
    scheduleRecurring: async (data: ReportJobData, _cronExpression: string) => {
      logger.info(`[Queue:reports] Recurring scheduling via BullMQ repeatable jobs — not yet wired`);
      return queues.reports.add('scheduled-report', data);
    },
  },

  notifications: {
    send: async (data: NotificationJobData) => {
      return queues.notifications.add('send-notification', data);
    },
    sendBulk: async (notifications: NotificationJobData[]) => {
      return queues.notifications.addBulk(
        notifications.map((n) => ({ name: 'send-notification', data: n }))
      );
    },
    lowStockAlert: async (
      tenantId: string,
      parts: Array<{ partId: string; partNumber: string; quantity: number; minStock: number }>
    ) => {
      return queues.notifications.add('low-stock-alert', {
        tenantId,
        type: 'warning',
        title: 'Low stock alert',
        message: `${parts.length} items need restocking`,
        channels: ['app', 'email'],
        data: { parts },
      });
    },
  },

  exports: {
    create: async (data: ExportJobData) => {
      return queues.exports.add('export-data', data, {
        jobId: `export-${data.tenantId}-${data.exportType}-${Date.now()}`,
      });
    },
  },

  imports: {
    create: async (data: ImportJobData) => {
      return queues.imports.add('import-data', data, {
        jobId: `import-${data.tenantId}-${data.importType}-${Date.now()}`,
      });
    },
  },

  emails: {
    send: async (data: EmailJobData) => {
      return queues.emails.add('send-email', data);
    },
    sendBulk: async (emails: EmailJobData[]) => {
      return queues.emails.addBulk(
        emails.map((e) => ({ name: 'send-email', data: e }))
      );
    },
  },

  scheduled: {
    backup: async (tenantId: string) => {
      return queues.scheduled.add('backup', { tenantId, taskType: 'backup' });
    },
    cleanup: async (tenantId: string) => {
      return queues.scheduled.add('cleanup', { tenantId, taskType: 'cleanup' });
    },
    alertCheck: async (tenantId: string) => {
      return queues.scheduled.add('alert-check', { tenantId, taskType: 'alert-check' });
    },
  },
};

// =============================================================================
// JOB STATUS HELPERS
// =============================================================================

type BullJobLike = {
  id?: string | number;
  name?: string;
  progress?: number | object;
  data?: unknown;
  returnvalue?: unknown;
  failedReason?: string;
  attemptsMade?: number;
  processedOn?: number;
  finishedOn?: number;
  getState?: () => Promise<string>;
};

export async function getJobStatus(queue: keyof typeof queues, jobId: string) {
  const q = queues[queue];
  const job = (await q.getJob(jobId)) as BullJobLike | null;

  if (!job) return null;

  // BullMQ job has getState(); in-memory job has status field.
  let state: string;
  if (typeof job.getState === 'function') {
    state = await job.getState();
  } else {
    state = (job as unknown as QueuedJob).status ?? 'unknown';
  }

  return {
    id: String(job.id ?? ''),
    name: job.name ?? '',
    state,
    progress: typeof job.progress === 'number' ? job.progress : 0,
    data: job.data,
    returnValue: job.returnvalue,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade ?? 0,
    processedOn: job.processedOn ? new Date(job.processedOn) : undefined,
    finishedOn: job.finishedOn ? new Date(job.finishedOn) : undefined,
  };
}

export async function getQueueStats(queue: keyof typeof queues) {
  const q = queues[queue];

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    q.getWaitingCount(),
    q.getActiveCount(),
    q.getCompletedCount(),
    q.getFailedCount(),
    q.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

export async function getAllQueueStats() {
  const stats: Record<string, unknown> = {};

  for (const queueName of Object.keys(queues)) {
    stats[queueName] = await getQueueStats(queueName as keyof typeof queues);
  }

  return stats;
}

// =============================================================================
// SHUTDOWN
// =============================================================================

/**
 * Closes all queues + queue event listeners + the BullMQ Redis connection.
 * Safe to call from SIGTERM/SIGINT handlers. Idempotent: calling twice is a no-op.
 */
export async function closeAllQueues() {
  await Promise.all([
    ...Object.values(queues).map((q) => q.close()),
    ...Object.values(queueEvents).map((e) => e.close()),
  ]);
  await closeBullConnection();
}

// =============================================================================
// EXPORTS
// =============================================================================

export default jobs;
