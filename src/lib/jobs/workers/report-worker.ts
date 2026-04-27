// =============================================================================
// RTR MRP - Report Worker
// Processes jobs from the 'report-generate' queue. Delegates to
// generateReportData + renderers. Email delivery is left to the caller who
// already does it synchronously inside POST /api/reports/send — this worker is
// the async escape hatch for heavy reports.
// =============================================================================

import { Worker, type Job } from 'bullmq';
import { logger } from '@/lib/logger';
import { generateReportData } from '@/lib/reports/report-generator';
import { QUEUE_NAMES, type ReportJobData } from '../queue';
import { getBullConnection, isInMemoryMode } from '../connection';

const CONCURRENCY = Number(process.env.REPORT_WORKER_CONCURRENCY ?? 2);

export function startReportWorker(): Worker<ReportJobData> | null {
  if (isInMemoryMode()) {
    logger.info('[Report-Worker] Skipped — in-memory mode');
    return null;
  }

  const connection = getBullConnection();
  if (!connection) {
    logger.warn('[Report-Worker] Skipped — no Redis connection');
    return null;
  }

  const worker = new Worker<ReportJobData>(
    QUEUE_NAMES.REPORTS,
    async (job: Job<ReportJobData>) => {
      logger.info(`[Report-Worker] Processing job ${job.id}`, {
        jobName: job.name,
        reportType: job.data.reportType,
        format: job.data.format,
      });

      // Report payloads use templateId under parameters.templateId or the
      // reportType as templateId fallback.
      const templateId =
        (job.data.parameters?.templateId as string) ?? job.data.reportType;
      const filters = (job.data.parameters?.filters as Record<string, unknown>) ?? undefined;

      const data = await generateReportData(templateId, filters);
      await job.updateProgress(50);

      logger.info(`[Report-Worker] Job ${job.id} generated data`, {
        template: data.template.name,
        rows: Array.isArray(data.rows) ? data.rows.length : undefined,
      });

      // Return the summary so callers (QueueEvents, status endpoint) can surface it.
      return {
        reportName: data.template.name,
        reportNameVi: data.template.nameVi,
        summaryHighlights: data.summary.highlights,
      };
    },
    { connection, concurrency: CONCURRENCY }
  );

  worker.on('completed', (job) => logger.info(`[Report-Worker] Job ${job.id} OK`));
  worker.on('failed', (job, err) => {
    logger.logError(err, {
      context: 'report-worker',
      jobId: job?.id,
      attemptsMade: job?.attemptsMade,
    });
  });
  worker.on('error', (err) => {
    logger.logError(err, { context: 'report-worker', phase: 'connection' });
  });

  logger.info(
    `[Report-Worker] Listening on queue '${QUEUE_NAMES.REPORTS}' (concurrency=${CONCURRENCY})`
  );
  return worker;
}
