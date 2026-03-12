// src/hooks/use-work-session.ts
// Hook for tracking a single work session on entity pages (PO, SO, WO, etc.)

'use client';

import { useCallback, useEffect, useRef } from 'react';
import type {
  EntityType,
  SessionContext,
  WorkSession,
} from '@/types/work-session';

interface UseWorkSessionOptions {
  entityType: EntityType;
  entityId: string;
  entityNumber: string;
  workflowSteps?: string[];
  currentStep?: number;
  enabled?: boolean;
}

async function apiCall(body: Record<string, unknown>) {
  const res = await fetch('/api/work-sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

export function useWorkSession(options: UseWorkSessionOptions) {
  const { entityType, entityId, entityNumber, workflowSteps, currentStep, enabled = true } = options;
  const sessionRef = useRef<string | null>(null);
  const entityIdRef = useRef(entityId);

  // Start or resume session on mount
  useEffect(() => {
    if (!enabled || !entityId) return;
    entityIdRef.current = entityId;

    const initSession = async () => {
      try {
        const session: WorkSession | null = await apiCall({
          action: 'start',
          entityType,
          entityId,
          entityNumber,
          resumeUrl: typeof window !== 'undefined' ? window.location.href : '',
          workflowSteps,
          currentStep,
        });
        if (session) {
          sessionRef.current = session.id;
        }
      } catch {
        // Silently fail - session tracking is non-critical
      }
    };

    initSession();

    // Auto-pause on page leave
    return () => {
      if (sessionRef.current) {
        const body = JSON.stringify({
          action: 'pause',
          sessionId: sessionRef.current,
        });
        // Use sendBeacon for reliable delivery on page unload
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon('/api/work-sessions', body);
        }
        sessionRef.current = null;
      }
    };
  }, [entityId, entityType, entityNumber, enabled, workflowSteps, currentStep]);

  // Track activity
  const trackActivity = useCallback(
    async (action: string, description: string, metadata?: Record<string, unknown>) => {
      if (!sessionRef.current) return;
      try {
        await apiCall({
          action: 'trackActivity',
          sessionId: sessionRef.current,
          activityAction: action,
          description,
          metadata,
        });
      } catch {
        // Non-critical
      }
    },
    []
  );

  // Update context
  const updateContext = useCallback(async (context: Partial<SessionContext>) => {
    if (!sessionRef.current) return;
    try {
      await apiCall({
        action: 'updateContext',
        sessionId: sessionRef.current,
        context,
      });
    } catch {
      // Non-critical
    }
  }, []);

  // Update workflow step
  const setWorkflowStep = useCallback(
    async (step: number, stepName: string, totalSteps?: number) => {
      if (!sessionRef.current) return;
      try {
        await apiCall({
          action: 'updateWorkflow',
          sessionId: sessionRef.current,
          workflowStep: step,
          workflowStepName: stepName,
          workflowTotalSteps: totalSteps,
        });
      } catch {
        // Non-critical
      }
    },
    []
  );

  // Complete session
  const completeSession = useCallback(async () => {
    if (!sessionRef.current) return;
    try {
      await apiCall({
        action: 'complete',
        sessionId: sessionRef.current,
      });
      sessionRef.current = null;
    } catch {
      // Non-critical
    }
  }, []);

  return {
    sessionId: sessionRef.current,
    trackActivity,
    updateContext,
    setWorkflowStep,
    completeSession,
  };
}
