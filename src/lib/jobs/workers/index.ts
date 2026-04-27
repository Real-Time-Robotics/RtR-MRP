// =============================================================================
// RTR MRP - Worker Bootstrap
// Start all BullMQ workers in one process. Wire SIGTERM/SIGINT for graceful
// shutdown. Run via: `node -r tsx/cjs src/lib/jobs/workers/index.ts`
// or `npm run workers` (add script in package.json).
// =============================================================================

import '@/lib/env';
import { logger } from '@/lib/logger';
import { startMrpWorker } from './mrp-worker';
import { startReportWorker } from './report-worker';
import { startNotificationWorker } from './notification-worker';
import { closeAllQueues } from '../queue';

const SHUTDOWN_TIMEOUT_MS = 30_000;

async function main() {
  logger.info('[Workers] Starting RTR-MRP worker process…');

  const workers = [
    startMrpWorker(),
    startReportWorker(),
    startNotificationWorker(),
  ].filter((w): w is NonNullable<typeof w> => w !== null);

  if (workers.length === 0) {
    logger.warn(
      '[Workers] No workers started. Check REDIS_URL and USE_INMEMORY_QUEUE env vars. Exiting.'
    );
    process.exit(0);
  }

  logger.info(`[Workers] ${workers.length} worker(s) running. Waiting for jobs…`);

  let shuttingDown = false;
  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`[Workers] ${signal} received — shutting down workers…`);

    // Hard-deadline: force exit if workers fail to close within SHUTDOWN_TIMEOUT_MS.
    const hardExit = setTimeout(() => {
      logger.warn('[Workers] Shutdown timeout exceeded — forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    hardExit.unref();

    try {
      // close() stops accepting new jobs and waits for active ones to finish.
      await Promise.all(workers.map((w) => w.close()));
      await closeAllQueues();
      logger.info('[Workers] Clean shutdown complete');
      clearTimeout(hardExit);
      process.exit(0);
    } catch (err) {
      logger.logError(err as Error, { context: 'workers', phase: 'shutdown' });
      clearTimeout(hardExit);
      process.exit(1);
    }
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.logError(err as Error, { context: 'workers', phase: 'startup' });
  process.exit(1);
});
