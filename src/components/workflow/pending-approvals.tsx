'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
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
  CheckSquare,
  Square,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { SLAIndicator } from './sla-indicator';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';

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
  enableBulkActions?: boolean;
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

export function PendingApprovals({
  userId,
  onApprovalComplete,
  enableBulkActions = true,
}: PendingApprovalsProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  // Dialog state
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Bulk action dialog
  const [bulkActionType, setBulkActionType] = useState<'approve' | 'reject' | null>(null);
  const [bulkComments, setBulkComments] = useState('');

  const loadApprovals = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/workflows/approvals?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch approvals');

      const data = await res.json();
      setApprovals(data.approvals || []);
      setSelectedIds(new Set()); // Clear selection on reload
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
        title: t('approval.error'),
        description: t('approval.rejectReasonRequired'),
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
        title: actionType === 'approve' ? t('approval.approved') : t('approval.rejected'),
        description: actionType === 'approve'
          ? t('approval.workflowApproved', { name: selectedApproval.instance.workflow.name })
          : t('approval.workflowRejected', { name: selectedApproval.instance.workflow.name }),
      });

      setSelectedApproval(null);
      setActionType(null);
      setComments('');
      loadApprovals();
      onApprovalComplete?.();
    } catch (err) {
      toast({
        title: t('approval.error'),
        description: err instanceof Error ? err.message : t('approval.cannotProcess'),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkAction = async () => {
    if (selectedIds.size === 0 || !bulkActionType) return;
    if (bulkActionType === 'reject' && !bulkComments.trim()) {
      toast({
        title: t('approval.error'),
        description: t('approval.rejectReasonRequired'),
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const selectedApprovals = approvals.filter((a) => selectedIds.has(a.id));
      const bulkPayload = {
        approverId: userId,
        approvals: selectedApprovals.map((a) => ({
          instanceId: a.instanceId,
          decision: bulkActionType,
          comments: bulkComments.trim() || undefined,
        })),
      };

      const res = await fetch('/api/workflows/approvals/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkPayload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to process bulk action');
      }

      const result = await res.json();

      toast({
        title: result.success ? t('approval.success') : t('approval.completedWithErrors'),
        description: t('approval.bulkResult', { success: String(result.summary.successful), total: String(result.summary.total) }),
        variant: result.success ? 'default' : 'destructive',
      });

      setBulkActionType(null);
      setBulkComments('');
      setSelectedIds(new Set());
      setBulkMode(false);
      loadApprovals();
      onApprovalComplete?.();
    } catch (err) {
      toast({
        title: t('approval.error'),
        description: err instanceof Error ? err.message : t('approval.cannotProcessBulk'),
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

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === approvals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(approvals.map((a) => a.id)));
    }
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
            {t('approval.title')}
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
              {t('approval.title')}
              {approvals.length > 0 && (
                <Badge variant="destructive">{approvals.length}</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {enableBulkActions && approvals.length > 1 && (
                <Button
                  variant={bulkMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setBulkMode(!bulkMode);
                    setSelectedIds(new Set());
                  }}
                >
                  {bulkMode ? (
                    <>
                      <XCircle className="w-4 h-4 mr-1" />
                      {t('approval.cancel')}
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-4 h-4 mr-1" />
                      {t('approval.bulkSelect')}
                    </>
                  )}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={loadApprovals} disabled={loading}>
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg mb-4">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Bulk Action Bar */}
          {bulkMode && selectedIds.size > 0 && (
            <div className="flex items-center justify-between p-3 mb-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {t('approval.selectedCount', { count: String(selectedIds.size) })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => setBulkActionType('approve')}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  {t('approval.approveAll')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setBulkActionType('reject')}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  {t('approval.rejectAll')}
                </Button>
              </div>
            </div>
          )}

          {/* Select All */}
          {bulkMode && approvals.length > 0 && (
            <div className="flex items-center gap-2 mb-3 pb-3 border-b">
              <Checkbox
                checked={selectedIds.size === approvals.length}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                {t('approval.selectAll', { count: String(approvals.length) })}
              </span>
            </div>
          )}

          {approvals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p className="font-medium">{t('approval.allDone')}</p>
              <p className="text-sm">{t('approval.noRequests')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvals.map((approval) => {
                const Icon = entityIcons[approval.instance.entityType] || FileText;
                const overdue = isOverdue(approval.dueDate);
                const isSelected = selectedIds.has(approval.id);

                return (
                  <div
                    key={approval.id}
                    className={cn(
                      'p-4 border rounded-lg transition-colors',
                      overdue ? 'border-red-200 bg-red-50 dark:bg-red-950/50' : 'hover:bg-muted/50',
                      bulkMode && isSelected && 'border-primary bg-primary/5'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {bulkMode && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(approval.id)}
                            className="mt-1"
                          />
                        )}
                        <div className={cn('p-2 rounded-lg', overdue ? 'bg-red-100' : 'bg-muted')}>
                          <Icon className={cn('w-5 h-5', overdue && 'text-red-600')} />
                        </div>
                        <div>
                          <p className="font-medium">{approval.instance.workflow.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {t('approval.step', { number: String(approval.step.stepNumber), name: approval.step.name })}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {approval.instance.entityType.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(approval.requestedAt), { addSuffix: true })}
                            </span>
                            {approval.dueDate && (
                              <SLAIndicator
                                dueDate={approval.dueDate}
                                size="sm"
                                showCountdown={true}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                      {!bulkMode && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => openDialog(approval, 'approve')}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {t('approval.approve')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => openDialog(approval, 'reject')}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            {t('approval.reject')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Single Approval Dialog */}
      <Dialog open={!!selectedApproval} onOpenChange={() => setSelectedApproval(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'approve' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              {actionType === 'approve' ? t('approval.approveRequest') : t('approval.rejectRequest')}
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
                  {t('approval.notes')} {actionType === 'reject' && <span className="text-red-500">*</span>}
                </label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder={
                    actionType === 'reject'
                      ? t('approval.rejectPlaceholder')
                      : t('approval.optionalNotes')
                  }
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedApproval(null)}>
              {t('approval.cancel')}
            </Button>
            <Button
              onClick={handleSubmitDecision}
              disabled={submitting || (actionType === 'reject' && !comments.trim())}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {submitting ? t('approval.processing') : actionType === 'approve' ? t('approval.approved') : t('approval.rejected')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog open={!!bulkActionType} onOpenChange={() => setBulkActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {bulkActionType === 'approve' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              {bulkActionType === 'approve'
                ? t('approval.bulkApproveTitle', { count: String(selectedIds.size) })
                : t('approval.bulkRejectTitle', { count: String(selectedIds.size) })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                {t('approval.bulkConfirm', {
                  action: bulkActionType === 'approve' ? t('approval.bulkApprove') : t('approval.bulkReject'),
                  count: String(selectedIds.size),
                })}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">
                {t('approval.commonNotes')} {bulkActionType === 'reject' && <span className="text-red-500">*</span>}
              </label>
              <Textarea
                value={bulkComments}
                onChange={(e) => setBulkComments(e.target.value)}
                placeholder={
                  bulkActionType === 'reject'
                    ? t('approval.bulkRejectPlaceholder')
                    : t('approval.bulkOptionalNotes')
                }
                rows={3}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionType(null)}>
              {t('approval.cancel')}
            </Button>
            <Button
              onClick={handleBulkAction}
              disabled={submitting || (bulkActionType === 'reject' && !bulkComments.trim())}
              className={bulkActionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {submitting
                ? t('approval.processing')
                : t('approval.bulkSubmit', {
                    action: bulkActionType === 'approve' ? t('approval.approved') : t('approval.rejected'),
                    count: String(selectedIds.size),
                  })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PendingApprovals;
