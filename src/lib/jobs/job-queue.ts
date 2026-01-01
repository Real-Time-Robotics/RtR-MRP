// src/lib/jobs/job-queue.ts
// Background job queue for heavy operations

import { logger } from "@/lib/monitoring/logger";

// ============================================
// TYPES
// ============================================

export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface Job<T = unknown> {
  id: string;
  name: string;
  data: T;
  status: JobStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: unknown;
  progress?: number;
}

export interface JobHandler<T = unknown, R = unknown> {
  (job: Job<T>, updateProgress: (progress: number) => void): Promise<R>;
}

export interface QueueOptions {
  concurrency?: number;
  maxRetries?: number;
  retryDelay?: number; // ms
  timeout?: number; // ms
}

// ============================================
// JOB QUEUE IMPLEMENTATION
// ============================================

class JobQueue {
  private jobs: Map<string, Job> = new Map();
  private handlers: Map<string, JobHandler> = new Map();
  private queue: string[] = [];
  private processing: Set<string> = new Set();
  private options: Required<QueueOptions>;
  private isProcessing = false;

  constructor(options: QueueOptions = {}) {
    this.options = {
      concurrency: options.concurrency ?? 3,
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
      timeout: options.timeout ?? 300000, // 5 minutes default
    };
  }

  // Register a job handler
  register<T, R>(name: string, handler: JobHandler<T, R>): void {
    this.handlers.set(name, handler as JobHandler);
    logger.info(`Job handler registered: ${name}`);
  }

  // Add a job to the queue
  add<T>(name: string, data: T, priority: number = 0): Job<T> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const job: Job<T> = {
      id,
      name,
      data,
      status: "pending",
      priority,
      attempts: 0,
      maxAttempts: this.options.maxRetries,
      createdAt: new Date(),
    };

    this.jobs.set(id, job as Job);
    this.queue.push(id);
    this.sortQueue();

    logger.info(`Job added: ${name}`, { jobId: id, priority });

    // Start processing if not already
    this.processQueue();

    return job;
  }

  // Get job by ID
  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  // Get all jobs
  getAllJobs(): Job[] {
    return Array.from(this.jobs.values());
  }

  // Get jobs by status
  getJobsByStatus(status: JobStatus): Job[] {
    return Array.from(this.jobs.values()).filter((job) => job.status === status);
  }

  // Cancel a job
  cancel(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;

    if (job.status === "pending") {
      job.status = "cancelled";
      this.queue = this.queue.filter((jid) => jid !== id);
      return true;
    }

    return false;
  }

  // Retry a failed job
  retry(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job || job.status !== "failed") return false;

    job.status = "pending";
    job.attempts = 0;
    job.error = undefined;
    this.queue.push(id);
    this.sortQueue();
    this.processQueue();

    return true;
  }

  // Clear completed/failed jobs
  clear(olderThanMs: number = 3600000): number {
    const cutoff = Date.now() - olderThanMs;
    let cleared = 0;

    for (const [id, job] of Array.from(this.jobs.entries())) {
      if (
        (job.status === "completed" || job.status === "failed" || job.status === "cancelled") &&
        job.createdAt.getTime() < cutoff
      ) {
        this.jobs.delete(id);
        cleared++;
      }
    }

    return cleared;
  }

  // Get queue statistics
  getStats(): {
    pending: number;
    running: number;
    completed: number;
    failed: number;
    total: number;
  } {
    const jobs = Array.from(this.jobs.values());
    return {
      pending: jobs.filter((j) => j.status === "pending").length,
      running: jobs.filter((j) => j.status === "running").length,
      completed: jobs.filter((j) => j.status === "completed").length,
      failed: jobs.filter((j) => j.status === "failed").length,
      total: jobs.length,
    };
  }

  // Private: Sort queue by priority (higher first)
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      const jobA = this.jobs.get(a);
      const jobB = this.jobs.get(b);
      return (jobB?.priority ?? 0) - (jobA?.priority ?? 0);
    });
  }

  // Private: Process the queue
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0 && this.processing.size < this.options.concurrency) {
      const jobId = this.queue.shift();
      if (!jobId) continue;

      const job = this.jobs.get(jobId);
      if (!job || job.status !== "pending") continue;

      this.processing.add(jobId);
      this.processJob(job).finally(() => {
        this.processing.delete(jobId);
        // Continue processing
        if (this.queue.length > 0) {
          this.processQueue();
        }
      });
    }

    this.isProcessing = false;
  }

  // Private: Process a single job
  private async processJob(job: Job): Promise<void> {
    const handler = this.handlers.get(job.name);

    if (!handler) {
      job.status = "failed";
      job.error = `No handler registered for job: ${job.name}`;
      logger.error(`Job handler not found: ${job.name}`);
      return;
    }

    job.status = "running";
    job.startedAt = new Date();
    job.attempts++;

    const updateProgress = (progress: number) => {
      job.progress = Math.min(100, Math.max(0, progress));
    };

    try {
      // Run with timeout
      const result = await Promise.race([
        handler(job, updateProgress),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Job timeout")),
            this.options.timeout
          )
        ),
      ]);

      job.status = "completed";
      job.completedAt = new Date();
      job.result = result;
      job.progress = 100;

      logger.info(`Job completed: ${job.name}`, {
        jobId: job.id,
        duration: job.completedAt.getTime() - (job.startedAt?.getTime() ?? 0),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      if (job.attempts < job.maxAttempts) {
        // Retry
        job.status = "pending";
        job.error = errorMessage;
        this.queue.push(job.id);

        logger.warn(`Job failed, retrying: ${job.name}`, {
          jobId: job.id,
          attempt: job.attempts,
          error: errorMessage,
        });

        // Delay before retry
        await new Promise((resolve) =>
          setTimeout(resolve, this.options.retryDelay * job.attempts)
        );
      } else {
        // Max retries exceeded
        job.status = "failed";
        job.completedAt = new Date();
        job.error = errorMessage;

        logger.error(
          `Job failed permanently: ${job.name} (id: ${job.id}, attempts: ${job.attempts})`,
          new Error(errorMessage)
        );
      }
    }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

const globalForQueue = globalThis as unknown as { jobQueue: JobQueue };

export const jobQueue: JobQueue = globalForQueue.jobQueue ?? new JobQueue();

if (process.env.NODE_ENV !== "production") {
  globalForQueue.jobQueue = jobQueue;
}

export default jobQueue;

// ============================================
// PRE-DEFINED JOB NAMES
// ============================================

export const JOB_NAMES = {
  EXCEL_IMPORT: "excel:import",
  EXCEL_EXPORT: "excel:export",
  MRP_CALCULATION: "mrp:calculate",
  REPORT_GENERATION: "report:generate",
  CACHE_WARMING: "cache:warm",
  EMAIL_SEND: "email:send",
  DATA_SYNC: "data:sync",
  CLEANUP: "system:cleanup",
};
