import { Queue } from 'bullmq';
import { connection } from '../redis';

export const MRP_QUEUE_NAME = 'mrp-calculation-queue';

export interface MrpJobData {
    runId?: string; // If existing run ID
    planningHorizonDays: number;
    includeConfirmed: boolean;
    includeDraft: boolean;
    includeSafetyStock: boolean;
    userId?: string; // Who triggered it
}

// Create the Queue instance
// We use the shared Redis connection settings
export const mrpQueue = new Queue<MrpJobData>(MRP_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: {
            age: 24 * 3600, // Keep for 24 hours
            count: 100,
        },
        removeOnFail: {
            age: 7 * 24 * 3600, // Keep for 7 days
        },
    },
});

export async function addMrpJob(data: MrpJobData) {
    return mrpQueue.add('calculate-mrp', data);
}
