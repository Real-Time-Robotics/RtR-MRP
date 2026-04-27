// =============================================================================
// RTR MRP - Notification Worker
// Processes jobs from the 'notification-send' queue. Persists each
// notification via createNotification(). Email/push channels are placeholders
// — workers fan out by the `channels` array; for now only 'app' channel is
// wired, email/push are logged and will be implemented when the email worker
// is in place.
// =============================================================================

import { Worker, type Job } from 'bullmq';
import { logger } from '@/lib/logger';
import { createNotification } from '@/lib/notifications';
import { QUEUE_NAMES, type NotificationJobData } from '../queue';
import { getBullConnection, isInMemoryMode } from '../connection';

const CONCURRENCY = Number(process.env.NOTIFICATION_WORKER_CONCURRENCY ?? 5);

export function startNotificationWorker(): Worker<NotificationJobData> | null {
  if (isInMemoryMode()) {
    logger.info('[Notification-Worker] Skipped — in-memory mode');
    return null;
  }

  const connection = getBullConnection();
  if (!connection) {
    logger.warn('[Notification-Worker] Skipped — no Redis connection');
    return null;
  }

  const worker = new Worker<NotificationJobData>(
    QUEUE_NAMES.NOTIFICATIONS,
    async (job: Job<NotificationJobData>) => {
      logger.info(`[Notification-Worker] Processing job ${job.id}`, {
        jobName: job.name,
        type: job.data.type,
        channels: job.data.channels,
      });

      const recipients = new Set<string>();
      if (job.data.userId) recipients.add(job.data.userId);
      if (job.data.userIds) job.data.userIds.forEach((id) => recipients.add(id));

      if (recipients.size === 0) {
        logger.warn(`[Notification-Worker] Job ${job.id} has no recipients`);
        return { delivered: 0 };
      }

      const wantsApp = job.data.channels.includes('app');
      const wantsEmail = job.data.channels.includes('email');
      const wantsPush = job.data.channels.includes('push');

      let delivered = 0;
      for (const userId of recipients) {
        if (wantsApp) {
          await createNotification({
            userId,
            type: job.data.type,
            title: job.data.title,
            message: job.data.message,
            link: job.data.link,
            metadata: job.data.data,
          });
          delivered += 1;
        }
        // email + push are not wired yet — log the intent so ops can see
        // pending channels until the email worker is in place.
        if (wantsEmail) {
          logger.info('[Notification-Worker] email channel pending', { userId });
        }
        if (wantsPush) {
          logger.info('[Notification-Worker] push channel pending', { userId });
        }
      }

      return { delivered };
    },
    { connection, concurrency: CONCURRENCY }
  );

  worker.on('completed', (job, result) => {
    logger.info(`[Notification-Worker] Job ${job.id} OK`, { result });
  });
  worker.on('failed', (job, err) => {
    logger.logError(err, {
      context: 'notification-worker',
      jobId: job?.id,
      attemptsMade: job?.attemptsMade,
    });
  });
  worker.on('error', (err) => {
    logger.logError(err, { context: 'notification-worker', phase: 'connection' });
  });

  logger.info(
    `[Notification-Worker] Listening on queue '${QUEUE_NAMES.NOTIFICATIONS}' (concurrency=${CONCURRENCY})`
  );
  return worker;
}
