'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  User,
  MessageSquare,
  PlayCircle,
  RefreshCw,
  Forward,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { SLAIndicator } from './sla-indicator';

interface WorkflowStep {
  stepNumber: number;
  name: string;
  type: string;
  isRequired: boolean;
}

interface WorkflowApproval {
  id: string;
  decision: string;
  comments: string | null;
  requestedAt: string;
  respondedAt: string | null;
  approver: {
    id: string;
    name: string | null;
    email: string;
  };
  step: WorkflowStep;
}

interface HistoryEntry {
  id: string;
  action: string;
  stepNumber: number | null;
  previousStatus: string | null;
  newStatus: string | null;
  comments: string | null;
  createdAt: string;
  performer: {
    id: string;
    name: string | null;
  };
}

interface WorkflowInstance {
  id: string;
  entityType: string;
  entityId: string;
  status: string;
  currentStepNumber: number;
  startedAt: string;
  completedAt: string | null;
  dueDate: string | null;
  finalDecision: string | null;
  finalComments: string | null;
  workflow: {
    name: string;
    code: string;
    steps: WorkflowStep[];
  };
  approvals: WorkflowApproval[];
  history: HistoryEntry[];
  initiatedByUser: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface WorkflowTimelineProps {
  instanceId: string;
}

const statusConfig = {
  DRAFT: { color: 'bg-gray-100 text-gray-800', icon: Clock },
  PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  IN_PROGRESS: { color: 'bg-blue-100 text-blue-800', icon: PlayCircle },
  APPROVED: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
  REJECTED: { color: 'bg-red-100 text-red-800', icon: XCircle },
  CANCELLED: { color: 'bg-gray-100 text-gray-800', icon: XCircle },
  ESCALATED: { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
};

const actionIcons: Record<string, React.ElementType> = {
  STARTED: PlayCircle,
  APPROVED: CheckCircle,
  REJECTED: XCircle,
  ESCALATED: AlertTriangle,
  DELEGATED: Forward,
  CANCELLED: XCircle,
  COMMENTED: MessageSquare,
};

export function WorkflowTimeline({ instanceId }: WorkflowTimelineProps) {
  const [instance, setInstance] = useState<WorkflowInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInstance = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/workflows/${instanceId}`);
        if (!res.ok) throw new Error('Failed to load workflow');
        const data = await res.json();
        setInstance(data.instance);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };

    loadInstance();
  }, [instanceId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workflow Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !instance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workflow Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-red-500" />
            <p>{error || 'Workflow not found'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const StatusIcon = statusConfig[instance.status as keyof typeof statusConfig]?.icon || Clock;
  const statusColorClass = statusConfig[instance.status as keyof typeof statusConfig]?.color || 'bg-gray-100';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{instance.workflow.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {instance.entityType}: {instance.entityId}
            </p>
          </div>
          <Badge className={statusColorClass}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {instance.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Progress</span>
            <span className="text-muted-foreground">
              Step {instance.currentStepNumber} of {instance.workflow.steps.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {instance.workflow.steps.map((step, idx) => {
              const isCompleted = idx + 1 < instance.currentStepNumber ||
                instance.status === 'APPROVED';
              const isCurrent = idx + 1 === instance.currentStepNumber &&
                instance.status !== 'APPROVED' && instance.status !== 'REJECTED';
              const isRejected = instance.status === 'REJECTED' &&
                idx + 1 === instance.currentStepNumber;

              return (
                <div key={step.stepNumber} className="flex-1 flex items-center">
                  <div
                    className={`flex-1 h-2 rounded-full ${
                      isCompleted
                        ? 'bg-green-500'
                        : isCurrent
                        ? 'bg-blue-500'
                        : isRejected
                        ? 'bg-red-500'
                        : 'bg-gray-200'
                    }`}
                  />
                  {idx < instance.workflow.steps.length - 1 && (
                    <ArrowRight className="w-4 h-4 mx-1 text-gray-400" />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            {instance.workflow.steps.map((step) => (
              <span key={step.stepNumber} className="text-center flex-1">
                {step.name}
              </span>
            ))}
          </div>
        </div>

        {/* Info Section */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg mb-6">
          <div>
            <p className="text-xs text-muted-foreground">Initiated By</p>
            <p className="font-medium">
              {instance.initiatedByUser.name || instance.initiatedByUser.email}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Started</p>
            <p className="font-medium">
              {format(new Date(instance.startedAt), 'MMM d, yyyy HH:mm')}
            </p>
          </div>
          {instance.dueDate && (
            <div>
              <p className="text-xs text-muted-foreground">Due Date</p>
              <div className="flex items-center gap-2">
                <p className={`font-medium ${new Date(instance.dueDate) < new Date() ? 'text-red-600' : ''}`}>
                  {format(new Date(instance.dueDate), 'MMM d, yyyy HH:mm')}
                </p>
                <SLAIndicator
                  dueDate={instance.dueDate}
                  completedAt={instance.completedAt}
                  size="sm"
                />
              </div>
            </div>
          )}
          {instance.completedAt && (
            <div>
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="font-medium">
                {format(new Date(instance.completedAt), 'MMM d, yyyy HH:mm')}
              </p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Activity Timeline</h4>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

            {instance.history.map((entry, idx) => {
              const ActionIcon = actionIcons[entry.action] || RefreshCw;
              const isApproval = entry.action === 'APPROVED';
              const isRejection = entry.action === 'REJECTED';

              return (
                <div key={entry.id} className="relative flex gap-4 pb-4">
                  <div
                    className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
                      isApproval
                        ? 'bg-green-100 text-green-600'
                        : isRejection
                        ? 'bg-red-100 text-red-600'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <ActionIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {entry.action.charAt(0) + entry.action.slice(1).toLowerCase()}
                      </span>
                      {entry.stepNumber && (
                        <Badge variant="outline" className="text-xs">
                          Step {entry.stepNumber}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span>{entry.performer.name || 'Unknown'}</span>
                      <span>-</span>
                      <span>{formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}</span>
                    </div>
                    {entry.comments && (
                      <p className="mt-2 text-sm p-2 bg-muted rounded">
                        {entry.comments}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Approvals List */}
        {instance.approvals.length > 0 && (
          <div className="mt-6 space-y-4">
            <h4 className="font-medium text-sm">Approval Decisions</h4>
            <div className="space-y-2">
              {instance.approvals.map((approval) => (
                <div
                  key={approval.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        approval.decision === 'APPROVED'
                          ? 'bg-green-100 text-green-600'
                          : approval.decision === 'REJECTED'
                          ? 'bg-red-100 text-red-600'
                          : approval.decision === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {approval.decision === 'APPROVED' && <CheckCircle className="w-4 h-4" />}
                      {approval.decision === 'REJECTED' && <XCircle className="w-4 h-4" />}
                      {approval.decision === 'PENDING' && <Clock className="w-4 h-4" />}
                      {approval.decision === 'DELEGATED' && <Forward className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {approval.approver.name || approval.approver.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {approval.step.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        approval.decision === 'APPROVED'
                          ? 'default'
                          : approval.decision === 'REJECTED'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {approval.decision}
                    </Badge>
                    {approval.respondedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(approval.respondedAt), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default WorkflowTimeline;
