import { Worker, Job } from 'bullmq';
import { connection } from '../lib/redis';
import prisma from '../lib/prisma';
import { MRP_QUEUE_NAME, MrpJobData } from '../lib/queue/mrp.queue';
import { runMrpCalculation } from '../lib/mrp-engine';

const WORKER_CONCURRENCY = 1; // Run one MRP calculation at a time per worker to avoid DB lock issues

export const mrpWorker = new Worker<MrpJobData>(
    MRP_QUEUE_NAME,
    async (job: Job<MrpJobData>) => {
        const { runId, ...params } = job.data;
        console.log(`[MRP-Worker] Starting job ${job.id} for run ${runId || 'new'}`);

        try {
            // 1. If runId exists, update status to running
            // If not, runMrpCalculation will create it (legacy mode support)
            if (runId) {
                await prisma.mrpRun.update({
                    where: { id: runId },
                    data: {
                        status: 'running',
                        // startedAt removed as it doesn't exist in schema
                    },
                });
            }

            // 2. Run the calculation
            // NOTE: We are calling the existing engine for now. 
            // In the next refactor step, we will replace this with the new optimized engine logic.
            const result = await runMrpCalculation(params);

            // 3. Log success (status update is handled inside runMrpCalculation currently, 
            // but we should unify this eventually)
            console.log(`[MRP-Worker] Job ${job.id} completed. runId: ${result.id}`);

            return { runId: result.id, status: 'completed' };

        } catch (error) {
            console.error(`[MRP-Worker] Job ${job.id} failed:`, error);

            if (runId) {
                await prisma.mrpRun.update({
                    where: { id: runId },
                    data: {
                        status: 'failed',
                        completedAt: new Date(),
                        // Error details logged to console, schema doesn't support notes
                    },
                });
            }

            throw error;
        }
    },
    {
        connection,
        concurrency: WORKER_CONCURRENCY,
        lockDuration: 300000, // 5 minutes lock
    }
);

// Event listeners
mrpWorker.on('completed', (job) => {
    console.log(`[MRP-Worker] Job ${job.id} has completed!`);
});

mrpWorker.on('failed', (job, err) => {
    if (job) {
        console.error(`[MRP-Worker] Job ${job.id} has failed with ${err.message}`);
    } else {
        console.error(`[MRP-Worker] A job failed with ${err.message} (Job details unavailable)`);
    }
});

console.log('[MRP-Worker] Worker started and listening for jobs...');
