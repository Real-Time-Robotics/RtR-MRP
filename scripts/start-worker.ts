import { mrpWorker } from '../src/workers/mrp.worker';

console.log('👷 MRP Worker Starting...');

// Use the existing worker instance exported from the worker file
const worker = mrpWorker;
// Connection is already handled in mrp.worker.ts, but we keep the script simple
console.log('👷 MRP Worker script loaded');

worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err);
});

console.log('🚀 Worker is ready and listening for jobs!');
