// =============================================================================
// RTR MRP - MRP WORKER
// Disabled - Redis/BullMQ not available on Render free tier
// MRP calculations now run synchronously via API
// =============================================================================

// This file is kept for future use when Redis is available
// To enable: uncomment the BullMQ worker code below

/*
import { Worker, Job } from 'bullmq';
import { connection } from '../lib/redis';
import prisma from '../lib/prisma';
import { MRP_QUEUE_NAME, MrpJobData } from '../lib/queue/mrp.queue';
import { runMrpCalculation } from '../lib/mrp-engine';

const WORKER_CONCURRENCY = 1;

export const mrpWorker = new Worker<MrpJobData>(
  MRP_QUEUE_NAME,
  async (job: Job<MrpJobData>) => {
    // Worker implementation
  },
  { connection, concurrency: WORKER_CONCURRENCY }
);
*/

// Placeholder exports for compatibility
export const mrpWorker = null;

console.log('[MRP-Worker] Worker disabled (Redis not available)');
console.log('[MRP-Worker] MRP calculations run synchronously via /api/mrp');
