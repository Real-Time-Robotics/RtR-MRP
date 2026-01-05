// @ts-nocheck
// =============================================================================
// RTR MRP - BACKGROUND JOBS (BullMQ)
// Queue definitions and job handlers
// NOTE: Install bullmq before using: npm install bullmq
// =============================================================================

import { Queue, Worker, Job, QueueEvents, JobsOptions } from 'bullmq';

// =============================================================================
// REDIS CONNECTION
// =============================================================================

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
};

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
    planningHorizon: number; // days
  };
}

export interface ReportJobData {
  tenantId: string;
  userId: string;
  reportType: 'inventory' | 'sales' | 'production' | 'quality' | 'mrp' | 'custom';
  reportName: string;
  parameters: Record<string, any>;
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
  data?: Record<string, any>;
  channels: ('app' | 'email' | 'push')[];
}

export interface ExportJobData {
  tenantId: string;
  userId: string;
  exportType: 'parts' | 'inventory' | 'orders' | 'workorders' | 'all';
  format: 'excel' | 'csv' | 'json';
  filters?: Record<string, any>;
  emailWhenDone?: boolean;
}

export interface ImportJobData {
  tenantId: string;
  userId: string;
  importType: 'parts' | 'inventory' | 'orders' | 'bom';
  fileKey: string;  // S3 key
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
  data: Record<string, any>;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
  }>;
}

export interface ScheduledTaskData {
  tenantId: string;
  taskType: 'backup' | 'cleanup' | 'sync' | 'alert-check' | 'usage-report';
  parameters?: Record<string, any>;
}

// =============================================================================
// QUEUE DEFINITIONS
// =============================================================================

// Default job options
const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
  removeOnComplete: {
    age: 24 * 3600, // 24 hours
    count: 1000,
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // 7 days
  },
};

// Queue instances
export const queues = {
  mrp: new Queue<MRPJobData>('mrp', { connection }),
  reports: new Queue<ReportJobData>('reports', { connection }),
  notifications: new Queue<NotificationJobData>('notifications', { connection }),
  exports: new Queue<ExportJobData>('exports', { connection }),
  imports: new Queue<ImportJobData>('imports', { connection }),
  emails: new Queue<EmailJobData>('emails', { connection }),
  scheduled: new Queue<ScheduledTaskData>('scheduled', { connection }),
};

// Queue events for monitoring
export const queueEvents = {
  mrp: new QueueEvents('mrp', { connection }),
  reports: new QueueEvents('reports', { connection }),
  notifications: new QueueEvents('notifications', { connection }),
  exports: new QueueEvents('exports', { connection }),
  imports: new QueueEvents('imports', { connection }),
  emails: new QueueEvents('emails', { connection }),
  scheduled: new QueueEvents('scheduled', { connection }),
};

// =============================================================================
// JOB CREATORS
// =============================================================================

export const jobs = {
  /**
   * MRP Jobs
   */
  mrp: {
    /**
     * Run MRP calculation
     */
    run: async (data: MRPJobData) => {
      return queues.mrp.add('run-mrp', data, {
        ...defaultJobOptions,
        priority: 1, // High priority
        jobId: `mrp-${data.tenantId}-${Date.now()}`,
      });
    },
    
    /**
     * Schedule recurring MRP run
     */
    scheduleRecurring: async (tenantId: string, cronExpression: string) => {
      return queues.mrp.add(
        'scheduled-mrp',
        {
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
        },
        {
          ...defaultJobOptions,
          repeat: { pattern: cronExpression },
          jobId: `scheduled-mrp-${tenantId}`,
        }
      );
    },
  },

  /**
   * Report Jobs
   */
  reports: {
    /**
     * Generate report
     */
    generate: async (data: ReportJobData) => {
      return queues.reports.add('generate-report', data, {
        ...defaultJobOptions,
        priority: 2,
        jobId: `report-${data.tenantId}-${data.reportType}-${Date.now()}`,
      });
    },
    
    /**
     * Schedule recurring report
     */
    scheduleRecurring: async (
      data: ReportJobData,
      cronExpression: string
    ) => {
      return queues.reports.add('scheduled-report', data, {
        ...defaultJobOptions,
        repeat: { pattern: cronExpression },
        jobId: `scheduled-report-${data.tenantId}-${data.reportType}`,
      });
    },
  },

  /**
   * Notification Jobs
   */
  notifications: {
    /**
     * Send notification to single user
     */
    send: async (data: NotificationJobData) => {
      return queues.notifications.add('send-notification', data, {
        ...defaultJobOptions,
        attempts: 2,
        priority: 3,
      });
    },
    
    /**
     * Send notification to multiple users
     */
    sendBulk: async (notifications: NotificationJobData[]) => {
      return queues.notifications.addBulk(
        notifications.map(n => ({
          name: 'send-notification',
          data: n,
          opts: { ...defaultJobOptions, attempts: 2 },
        }))
      );
    },
    
    /**
     * Send low stock alert
     */
    lowStockAlert: async (tenantId: string, parts: Array<{ partId: string; partNumber: string; quantity: number; minStock: number }>) => {
      return queues.notifications.add(
        'low-stock-alert',
        {
          tenantId,
          type: 'warning',
          title: 'Cảnh báo tồn kho thấp',
          message: `${parts.length} mặt hàng cần bổ sung`,
          channels: ['app', 'email'],
          data: { parts },
        },
        { ...defaultJobOptions, priority: 1 }
      );
    },
  },

  /**
   * Export Jobs
   */
  exports: {
    /**
     * Export data
     */
    create: async (data: ExportJobData) => {
      return queues.exports.add('export-data', data, {
        ...defaultJobOptions,
        priority: 3,
        jobId: `export-${data.tenantId}-${data.exportType}-${Date.now()}`,
      });
    },
  },

  /**
   * Import Jobs
   */
  imports: {
    /**
     * Import data from file
     */
    create: async (data: ImportJobData) => {
      return queues.imports.add('import-data', data, {
        ...defaultJobOptions,
        priority: 2,
        jobId: `import-${data.tenantId}-${data.importType}-${Date.now()}`,
      });
    },
  },

  /**
   * Email Jobs
   */
  emails: {
    /**
     * Send single email
     */
    send: async (data: EmailJobData) => {
      return queues.emails.add('send-email', data, {
        ...defaultJobOptions,
        attempts: 5,
        backoff: { type: 'exponential', delay: 10000 },
      });
    },
    
    /**
     * Send bulk emails
     */
    sendBulk: async (emails: EmailJobData[]) => {
      return queues.emails.addBulk(
        emails.map(e => ({
          name: 'send-email',
          data: e,
          opts: { ...defaultJobOptions, attempts: 5 },
        }))
      );
    },
  },

  /**
   * Scheduled Tasks
   */
  scheduled: {
    /**
     * Run backup
     */
    backup: async (tenantId: string) => {
      return queues.scheduled.add(
        'backup',
        { tenantId, taskType: 'backup' },
        { ...defaultJobOptions, priority: 5 }
      );
    },
    
    /**
     * Cleanup old data
     */
    cleanup: async (tenantId: string) => {
      return queues.scheduled.add(
        'cleanup',
        { tenantId, taskType: 'cleanup' },
        { ...defaultJobOptions, priority: 5 }
      );
    },
    
    /**
     * Check and send alerts
     */
    alertCheck: async (tenantId: string) => {
      return queues.scheduled.add(
        'alert-check',
        { tenantId, taskType: 'alert-check' },
        { ...defaultJobOptions, priority: 2 }
      );
    },
  },
};

// =============================================================================
// JOB STATUS HELPERS
// =============================================================================

export async function getJobStatus(queue: keyof typeof queues, jobId: string) {
  const job = await queues[queue].getJob(jobId);
  
  if (!job) {
    return null;
  }
  
  const state = await job.getState();
  const progress = job.progress;
  
  return {
    id: job.id,
    name: job.name,
    state,
    progress,
    data: job.data,
    returnValue: job.returnvalue,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
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
  const stats: Record<string, any> = {};
  
  for (const queueName of Object.keys(queues)) {
    stats[queueName] = await getQueueStats(queueName as keyof typeof queues);
  }
  
  return stats;
}

// =============================================================================
// CLEANUP
// =============================================================================

export async function closeAllQueues() {
  await Promise.all([
    ...Object.values(queues).map(q => q.close()),
    ...Object.values(queueEvents).map(e => e.close()),
  ]);
}

// =============================================================================
// EXPORTS
// =============================================================================

export default jobs;
