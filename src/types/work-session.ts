// src/types/work-session.ts
// Work Session types for Context Continuity System

export type EntityType = 'PO' | 'SO' | 'MRP_RUN' | 'WORK_ORDER' | 'INVENTORY' | 'PART' | 'BOM';
export type SessionStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ABANDONED';

export interface SessionContext {
  summary: string;
  completedActions: string[];
  pendingActions: string[];
  keyMetrics: Record<string, string | number>;
  blockers?: string[];
}

export interface WorkSession {
  id: string;
  userId: string;
  entityType: EntityType;
  entityId: string;
  entityNumber: string;
  status: SessionStatus;
  workflowStep: number;
  workflowTotalSteps: number;
  workflowStepName: string;
  context: SessionContext;
  startedAt: string;
  lastActivityAt: string;
  pausedAt?: string | null;
  completedAt?: string | null;
  totalActiveTime: number;
  resumeUrl: string;
}

export interface SessionActivity {
  id: string;
  sessionId: string;
  action: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface StartSessionInput {
  entityType: EntityType;
  entityId: string;
  entityNumber: string;
  resumeUrl: string;
  workflowSteps?: string[];
  currentStep?: number;
}

export interface UpdateContextInput {
  sessionId: string;
  context: Partial<SessionContext>;
}

export interface UpdateWorkflowInput {
  sessionId: string;
  workflowStep: number;
  workflowStepName: string;
  workflowTotalSteps?: number;
}

export interface TrackActivityInput {
  sessionId: string;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
}
