'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { SLAIndicator } from './sla-indicator';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';
import { LivePulse } from '@/components/ui/live-pulse';
import { Loader2 } from 'lucide-react';

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
      setSelectedIds(new Set());
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

  // =========================================================================
  // COMPACT RENDER
  // =========================================================================

  if (loading) {
    return (
      <div className="bg-white dark:bg-gunmetal border border-gray-200 dark:border-mrp-border">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-mrp-border">
          <h2 className="text-[11px] font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-info-cyan" />
            {t('approval.title')}
          </h2>
        </div>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-info-cyan" />
          <span className="ml-2 text-[11px] text-gray-500 dark:text-mrp-text-muted">Đang tải...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gunmetal border border-gray-200 dark:border-mrp-border">
        {/* Header — compact, matches other panels */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-mrp-border">
          <h2 className="text-[11px] font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-info-cyan" />
            {t('approval.title')}
            {approvals.length > 0 && (
              <span className="px-1 py-0.5 text-[9px] font-bold bg-urgent-red-dim text-urgent-red animate-[pulse-dot_1.5s_infinite]">
                {approvals.length}
              </span>
            )}
            {approvals.length === 0 && <LivePulse status="live" size="sm" />}
          </h2>
          <div className="flex items-center gap-1">
            {enableBulkActions && approvals.length > 1 && (
              <button
                onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }}
                className={cn(
                  'flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider transition-colors',
                  bulkMode
                    ? 'text-info-cyan bg-info-cyan-dim'
                    : 'text-gray-500 dark:text-mrp-text-muted hover:text-info-cyan'
                )}
              >
                <CheckSquare className="w-3 h-3" />
                {bulkMode ? t('approval.cancel') : 'Bulk'}
              </button>
            )}
            <button
              onClick={loadApprovals}
              disabled={loading}
              className="flex items-center p-1 text-gray-500 dark:text-mrp-text-muted hover:text-info-cyan transition-colors"
            >
              <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-2">
          {error && (
            <div className="flex items-center gap-1.5 p-1.5 mb-2 bg-urgent-red-dim border border-urgent-red/30 text-[11px] font-mono text-urgent-red">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Bulk Action Bar */}
          {bulkMode && selectedIds.size > 0 && (
            <div className="flex items-center justify-between p-1.5 mb-2 bg-gray-50 dark:bg-steel-dark border border-gray-200 dark:border-mrp-border">
              <span className="text-[10px] font-mono text-gray-600 dark:text-mrp-text-secondary">
                {t('approval.selectedCount', { count: String(selectedIds.size) })}
              </span>
              <div className="flex items-center gap-1">
                <button
                  className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-production-green bg-production-green-dim hover:opacity-80 transition-opacity"
                  onClick={() => setBulkActionType('approve')}
                >
                  <CheckCircle className="w-3 h-3" />
                  {t('approval.approveAll')}
                </button>
                <button
                  className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-urgent-red bg-urgent-red-dim hover:opacity-80 transition-opacity"
                  onClick={() => setBulkActionType('reject')}
                >
                  <XCircle className="w-3 h-3" />
                  {t('approval.rejectAll')}
                </button>
              </div>
            </div>
          )}

          {/* Select All */}
          {bulkMode && approvals.length > 0 && (
            <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-gray-100 dark:border-mrp-border/50">
              <Checkbox
                checked={selectedIds.size === approvals.length}
                onCheckedChange={toggleSelectAll}
                className="h-3.5 w-3.5"
              />
              <span className="text-[10px] text-gray-500 dark:text-mrp-text-muted">
                {t('approval.selectAll', { count: String(approvals.length) })}
              </span>
            </div>
          )}

          {approvals.length === 0 ? (
            <div className="flex items-center gap-2 py-3 justify-center text-gray-400 dark:text-mrp-text-muted">
              <CheckCircle className="w-4 h-4 text-production-green" />
              <span className="text-[11px] font-mono">{t('approval.allDone')} — {t('approval.noRequests')}</span>
            </div>
          ) : (
            <div className="space-y-1">
              {approvals.map((approval) => {
                const Icon = entityIcons[approval.instance.entityType] || FileText;
                const overdue = isOverdue(approval.dueDate);
                const isSelected = selectedIds.has(approval.id);

                return (
                  <div
                    key={approval.id}
                    className={cn(
                      'flex items-center gap-2 p-2 border border-gray-200 dark:border-mrp-border transition-colors',
                      overdue && 'border-urgent-red/40 bg-urgent-red-dim',
                      !overdue && 'bg-gray-50 dark:bg-steel-dark hover:bg-gray-100 dark:hover:bg-gunmetal-light',
                      bulkMode && isSelected && 'border-info-cyan bg-info-cyan-dim',
                    )}
                  >
                    {bulkMode && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(approval.id)}
                        className="h-3.5 w-3.5 flex-shrink-0"
                      />
                    )}

                    {/* Icon */}
                    <div className={cn(
                      'w-6 h-6 flex items-center justify-center flex-shrink-0',
                      overdue ? 'bg-urgent-red-dim text-urgent-red' : 'bg-info-cyan-dim text-info-cyan',
                    )}>
                      <Icon className="w-3 h-3" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono font-medium text-gray-900 dark:text-mrp-text-primary truncate">
                          {approval.instance.workflow.name}
                        </span>
                        <span className="px-1 py-0 text-[8px] font-bold font-mono uppercase bg-gray-200 dark:bg-gunmetal text-gray-600 dark:text-mrp-text-muted flex-shrink-0">
                          {approval.instance.entityType.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] text-gray-500 dark:text-mrp-text-muted">
                          Bước {approval.step.stepNumber}: {approval.step.name}
                        </span>
                        <span className="text-[9px] text-gray-400 dark:text-mrp-text-muted">
                          {formatDistanceToNow(new Date(approval.requestedAt), { addSuffix: true })}
                        </span>
                        {approval.dueDate && (
                          <SLAIndicator dueDate={approval.dueDate} size="sm" showCountdown={true} />
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {!bulkMode && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          className="flex items-center gap-0.5 px-1.5 py-1 text-[10px] font-mono font-semibold text-production-green bg-production-green-dim hover:opacity-80 transition-opacity"
                          onClick={() => openDialog(approval, 'approve')}
                        >
                          <CheckCircle className="w-3 h-3" />
                        </button>
                        <button
                          className="flex items-center gap-0.5 px-1.5 py-1 text-[10px] font-mono font-semibold text-urgent-red bg-urgent-red-dim hover:opacity-80 transition-opacity"
                          onClick={() => openDialog(approval, 'reject')}
                        >
                          <XCircle className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
