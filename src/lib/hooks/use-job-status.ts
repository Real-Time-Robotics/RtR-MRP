// src/lib/hooks/use-job-status.ts
// Hook for polling background job status

import { useState, useEffect, useCallback, useRef } from "react";

export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface JobInfo {
  id: string;
  name: string;
  status: JobStatus;
  progress: number;
  attempts: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  result: unknown;
}

interface UseJobStatusOptions {
  /** Polling interval in ms (default 1000) */
  pollInterval?: number;
  /** Stop polling when job is done (default true) */
  stopOnComplete?: boolean;
  /** Callback when job completes */
  onComplete?: (job: JobInfo) => void;
  /** Callback when job fails */
  onError?: (job: JobInfo) => void;
}

export function useJobStatus(
  jobId: string | null,
  options: UseJobStatusOptions = {}
) {
  const {
    pollInterval = 1000,
    stopOnComplete = true,
    onComplete,
    onError,
  } = options;

  const [job, setJob] = useState<JobInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  // Keep callback refs fresh without causing re-polling
  onCompleteRef.current = onComplete;
  onErrorRef.current = onError;

  const fetchStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) {
        setError("Failed to fetch job status");
        return;
      }

      const data: JobInfo = await res.json();
      setJob(data);
      setError(null);

      // Check terminal states
      if (data.status === "completed") {
        onCompleteRef.current?.(data);
        if (stopOnComplete && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else if (data.status === "failed" || data.status === "cancelled") {
        onErrorRef.current?.(data);
        if (stopOnComplete && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch {
      setError("Network error polling job status");
    }
  }, [jobId, stopOnComplete]);

  // Start/stop polling when jobId changes
  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchStatus().finally(() => setLoading(false));

    intervalRef.current = setInterval(fetchStatus, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [jobId, pollInterval, fetchStatus]);

  const cancel = useCallback(async () => {
    if (!jobId) return false;
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      if (res.ok) {
        await fetchStatus();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [jobId, fetchStatus]);

  const isTerminal = job
    ? ["completed", "failed", "cancelled"].includes(job.status)
    : false;

  return {
    job,
    loading,
    error,
    isTerminal,
    cancel,
    refresh: fetchStatus,
  };
}
