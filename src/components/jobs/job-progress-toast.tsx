'use client';

import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { useJobStatus, JobInfo } from '@/lib/hooks/use-job-status';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

// =============================================================================
// JOB LABELS
// =============================================================================

const JOB_LABELS: Record<string, string> = {
  'excel:import': 'Excel Import',
  'excel:export': 'Excel Export',
  'mrp:calculate': 'MRP Calculation',
  'report:generate': 'Report Generation',
  'cache:warm': 'Cache Warming',
  'data:sync': 'Data Sync',
  'system:cleanup': 'System Cleanup',
  'email:send': 'Email Send',
};

function getJobLabel(name: string): string {
  return JOB_LABELS[name] || name;
}

// =============================================================================
// PROGRESS BAR COMPONENT (for inline use)
// =============================================================================

export function JobProgressBar({
  progress,
  status,
}: {
  progress: number;
  status: string;
}) {
  const isComplete = status === 'completed';
  const isFailed = status === 'failed' || status === 'cancelled';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="capitalize">{status}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isComplete
              ? 'bg-green-500'
              : isFailed
                ? 'bg-red-500'
                : 'bg-blue-500'
          }`}
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// JOB STATUS INDICATOR (inline component)
// =============================================================================

export function JobStatusIndicator({ job }: { job: JobInfo | null }) {
  if (!job) return null;

  const label = getJobLabel(job.name);

  switch (job.status) {
    case 'pending':
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{label}: Waiting...</span>
        </div>
      );
    case 'running':
      return (
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
          <span>{label}</span>
          <JobProgressBar progress={job.progress} status={job.status} />
        </div>
      );
    case 'completed':
      return (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>{label}: Done</span>
        </div>
      );
    case 'failed':
    case 'cancelled':
      return (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <XCircle className="h-3.5 w-3.5" />
          <span>{label}: {job.error || 'Failed'}</span>
        </div>
      );
    default:
      return null;
  }
}

// =============================================================================
// TOAST-BASED JOB TRACKER
// =============================================================================

/**
 * Hook that shows a sonner toast with live progress for a background job.
 * Usage:
 *   const { job, isTerminal } = useJobProgressToast(bgJobId, {
 *     onComplete: (job) => router.push(`/mrp/results/${job.result.runId}`),
 *   });
 */
export function useJobProgressToast(
  jobId: string | null,
  options: {
    onComplete?: (job: JobInfo) => void;
    onError?: (job: JobInfo) => void;
  } = {}
) {
  const { job, isTerminal, cancel } = useJobStatus(jobId, {
    pollInterval: 1000,
    onComplete: options.onComplete,
    onError: options.onError,
  });

  useEffect(() => {
    if (!job) return;

    const label = getJobLabel(job.name);

    if (job.status === 'running' || job.status === 'pending') {
      toast.loading(`${label}: ${Math.round(job.progress)}%`, {
        id: `job-${job.id}`,
        description: job.status === 'pending' ? 'Waiting in queue...' : `Processing... ${Math.round(job.progress)}%`,
      });
    } else if (job.status === 'completed') {
      toast.success(`${label} completed`, {
        id: `job-${job.id}`,
        description: 'Job finished successfully.',
      });
    } else if (job.status === 'failed') {
      toast.error(`${label} failed`, {
        id: `job-${job.id}`,
        description: job.error || 'An error occurred.',
      });
    } else if (job.status === 'cancelled') {
      toast.info(`${label} cancelled`, {
        id: `job-${job.id}`,
      });
    }
  }, [job]);

  return { job, isTerminal, cancel };
}
