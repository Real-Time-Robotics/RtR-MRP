// src/hooks/use-work-sessions.ts
// Hook for managing all user work sessions (used by WorkSessionPanel)

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { WorkSession } from '@/types/work-session';

interface UseWorkSessionsReturn {
  sessions: WorkSession[];
  activeSessions: WorkSession[];
  pausedSessions: WorkSession[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  pauseSession: (sessionId: string) => Promise<void>;
  resumeSession: (sessionId: string) => Promise<void>;
  completeSession: (sessionId: string) => Promise<void>;
  navigateToSession: (session: WorkSession) => void;
}

export function useWorkSessions(): UseWorkSessionsReturn {
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/work-sessions');
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const json = await res.json();
      setSessions(json.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Poll every 30 seconds for updates
  useEffect(() => {
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const apiAction = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await fetch('/api/work-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Action failed');
      await fetchSessions();
    },
    [fetchSessions]
  );

  const pauseSession = useCallback(
    async (sessionId: string) => {
      await apiAction({ action: 'pause', sessionId });
    },
    [apiAction]
  );

  const resumeSession = useCallback(
    async (sessionId: string) => {
      await apiAction({ action: 'resume', sessionId });
    },
    [apiAction]
  );

  const completeSession = useCallback(
    async (sessionId: string) => {
      await apiAction({ action: 'complete', sessionId });
    },
    [apiAction]
  );

  const navigateToSession = useCallback(
    (session: WorkSession) => {
      if (session.resumeUrl) {
        router.push(session.resumeUrl);
      }
    },
    [router]
  );

  const activeSessions = sessions.filter((s) => s.status === 'ACTIVE');
  const pausedSessions = sessions.filter((s) => s.status === 'PAUSED');

  return {
    sessions,
    activeSessions,
    pausedSessions,
    isLoading,
    error,
    refresh: fetchSessions,
    pauseSession,
    resumeSession,
    completeSession,
    navigateToSession,
  };
}
