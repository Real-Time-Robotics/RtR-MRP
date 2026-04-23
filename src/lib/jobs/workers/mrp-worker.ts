// =============================================================================
// RTR MRP - MRP Worker
// Processes jobs from the 'mrp-run' queue. Each job triggers runMrpCalculation
// with the payload's params. Runs only when BullMQ is active (Redis available
// + USE_INMEMORY_QUEUE !== 'true'). Otherwise the worker is a no-op and the
// caller should invoke runMrpCalculation synchronously via the API.
// =============================================================================

import { Worker, type Job } from 'bullmq';
import { logger } from '@/lib/logger';
import { runMrpCalculation } from '@/lib/mrp-engine/mrp-run';
import { QUEUE_NAMES, type MRPJobData } from '../queue';
import { getBullConnection, isInMemoryMode } from '../connection';

const CONCURRENCY = Number(process.env.MRP_WORKER_CONCURRENCY ?? 1);

export function startMrpWorker(): Worker<MRPJobData> | null {
  if (isInMemoryMode()) {
    logger.info('[MRP-Worker] Skipped — in-memory mode (set REDIS_URL and unset USE_INMEMORY_QUEUE to enable)');
    return null;
  }

  const connection = getBullConnection();
  if (!connection) {
    logger.warn('[MRP-Worker] Skipped — no Redis connection');
    return null;
  }

  const worker = new Worker<MRPJobData>(
    QUEUE_NAMES.MRP,
    async (job: Job<MRPJobData>) => {
      logger.info(`[MRP-Worker] Processing job ${job.id}`, {
        jobName: job.name,
        tenantId: job.data.tenantId,
        userId: job.data.userId,
      });

      // `runMrpCalculation` expects the engine-side `MrpParams` shape.
      // `MRPJobData.options` carries request-side flags (date-range,
      // includeDemand/Supply/WIP, planningHorizon). Map planningHorizon →
      // planningHorizonDays and leave the engine's include-* knobs on
      // sensible interactive-runner defaults. (See `src/lib/mrp-engine/types.ts`
      // for the authoritative MrpParams shape.)
      const params = {
        planningHorizonDays: job.data.options?.planningHorizon ?? 30,
        includeConfirmed: true,
        includeDraft: false,
        includeSafetyStock: true,
      };

      const result = await runMrpCalculation(params);
      logger.info(`[MRP-Worker] Job ${job.id} completed`, { runId: result.id });
      return { runId: result.id, status: result.status };
    },
    { connection, concurrency: CONCURRENCY }
  );

  worker.on('completed', (job) => {
    logger.info(`[MRP-Worker] Job ${job.id} OK`);
  });
  worker.on('failed', (job, err) => {
    logger.logError(err, {
      context: 'mrp-worker',
      jobId: job?.id,
      attemptsMade: job?.attemptsMade,
    });
  });
  worker.on('error', (err) => {
    logger.logError(err, { context: 'mrp-worker', phase: 'connection' });
  });

  logger.info(`[MRP-Worker] Listening on queue '${QUEUE_NAMES.MRP}' (concurrency=${CONCURRENCY})`);
  return worker;
}
