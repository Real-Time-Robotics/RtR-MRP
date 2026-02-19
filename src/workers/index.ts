import '../lib/env'; // Ensure env vars are loaded if you have a loader
// Import workers to start them
import './mrp.worker';
import { logger } from '@/lib/logger';

// Keep process alive
logger.info('[Worker System] All workers initialized.');

process.on('SIGTERM', async () => {
    logger.info('[Worker System] SIGTERM received. Shutting down...');
    process.exit(0);
});
