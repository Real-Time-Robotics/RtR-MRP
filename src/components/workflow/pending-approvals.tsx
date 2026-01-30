'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertTriangle,
  FileText,
  Package,
  ShoppingCart,
  Factory,
  AlertCircle,
  ClipboardCheck,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface PendingApproval {
  id: string;
  instanceId: string;
  requestedAt: string;
  dueDate: string | null;
  step: {
    name: string;
    stepNumber: number;
  };
  instance: {
    id: string;
    entityType: string;
    entityId: string;
    status: string;
    contextData: Record<string, unknown>;
    workflow: {
      name: string;
      code: string;
    };
  };
}

interface PendingApprovalsProps {
  userId: string;
  onApprovalComplete?: () => void;
}

const entityIcons: Record<string, React.ElementType> = {
  PURCHASE_ORDER: ShoppingCart,
  SALES_ORDER: FileText,
  WORK_ORDER: Factory,
  NCR: AlertCircle,
  CAPA: ClipboardCheck,
  INVENTORY_ADJUSTMENT: Package,
  ENGINEERING_CHANGE: AlertTriangle,
};

export function PendingApprovals({ userId, onApprovalComplete }: PendingApprovalsProps) {
  const { toast } = useToast();
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadApprovals = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/workflows/approvals?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch approvals');

      const data = await res.json();
      setApprovals(data.approvals || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const handleSubmitDecision = async () => {
    if (!selectedApproval || !actionType) return;
    if (actionType === 'reject' && !comments.trim()) {
      toast({
        title: 'Error',
        description: 'Comments are required when rejecting',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/workflows/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId: selectedApproval.instanceId,
          approverId: userId,
          decision: actionType,
          comments: comments.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit decision');
      }

      toast({
        title: actionType === 'approve' ? 'Approved' : 'Rejected',
        description: `${selectedApproval.instance.workflow.name} has been ${actionType}d`,
      });

      setSelectedApproval(null);
      setActionType(null);
      setComments('');
      loadApprovals();
      onApprovalComplete?.();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to submit decision',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openDialog = (approval: PendingApproval, action: 'approve' | 'reject') => {
    setSelectedApproval(approval);
    setActionType(action);
    setComments('');
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Pending Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pending Approvals
              {approvals.length > 0 && (
                <Badge variant="destructive">{approvals.length}</Badge>
              )}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={loadApprovals} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg mb-4">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {approvals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p className="font-medium">All caught up!</p>
              <p className="text-sm">No pending approvals</p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvals.map((approval) => {
                const Icon = entityIcons[approval.instance.entityType] || FileText;
                const overdue = isOverdue(approval.dueDate);

                return (
                  <div
                    key={approval.id}
                    className={`p-4 border rounded-lg ${
                      overdue ? 'border-red-200 bg-red-50 dark:bg-red-950/50' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${overdue ? 'bg-red-100' : 'bg-muted'}`}>
                          <Icon className={`w-5 h-5 ${overdue ? 'text-red-600' : ''}`} />
                        </div>
                        <div>
                          <p className="font-medium">{approval.instance.workflow.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Step {approval.step.stepNumber}: {approval.step.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {approval.instance.entityType.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(approval.requestedAt), { addSuffix: true })}
                            </span>
                            {overdue && (
                              <Badge variant="destructive" className="text-xs">
                                Overdue
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => openDialog(approval, 'approve')}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => openDialog(approval, 'reject')}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={!!selectedApproval} onOpenChange={() => setSelectedApproval(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'approve' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              {actionType === 'approve' ? 'Approve' : 'Reject'} Request
            </DialogTitle>
          </DialogHeader>

          {selectedApproval && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedApproval.instance.workflow.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedApproval.instance.entityType}: {selectedApproval.instance.entityId}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">
                  Comments {actionType === 'reject' && <span className="text-red-500">*</span>}
                </label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder={
                    actionType === 'reject'
                      ? 'Please provide a reason for rejection...'
                      : 'Optional comments...'
                  }
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedApproval(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitDecision}
              disabled={submitting || (actionType === 'reject' && !comments.trim())}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {submitting ? 'Submitting...' : actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PendingApprovals;
