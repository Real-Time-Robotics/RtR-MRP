'use client';

// src/components/ui-v2/bulk-actions-bar.tsx
// Bulk Actions Bar - Shows when items are selected in a data table

import React from 'react';
import { X, Trash2, Download, Edit, Archive, Tag, CheckCircle, AlertTriangle, MoreHorizontal, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clientLogger } from '@/lib/client-logger';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface BulkAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'destructive' | 'warning';
  onClick: (selectedIds: string[]) => void | Promise<void>;
  disabled?: boolean;
  requireConfirm?: boolean;
  confirmMessage?: string;
}

export interface BulkActionsBarProps {
  selectedCount: number;
  selectedIds: string[];
  totalCount: number;
  onClearSelection: () => void;
  actions: BulkAction[];
  className?: string;
  entityName?: string; // e.g., "parts", "orders"
  loading?: boolean;
}

const defaultActions: BulkAction[] = [];

export function BulkActionsBar({
  selectedCount,
  selectedIds,
  totalCount,
  onClearSelection,
  actions = defaultActions,
  className,
  entityName = 'mục',
  loading = false,
}: BulkActionsBarProps) {
  const [loadingAction, setLoadingAction] = React.useState<string | null>(null);

  if (selectedCount === 0) return null;

  const handleAction = async (action: BulkAction) => {
    if (action.requireConfirm) {
      const message = action.confirmMessage || `Bạn có chắc muốn ${action.label.toLowerCase()} ${selectedCount} ${entityName}?`;
      if (!confirm(message)) return;
    }

    setLoadingAction(action.id);
    try {
      await action.onClick(selectedIds);
    } catch (error) {
      clientLogger.error(`Bulk action ${action.id} failed`, error);
    } finally {
      setLoadingAction(null);
    }
  };

  // Separate primary actions (first 3) and overflow actions
  const primaryActions = actions.slice(0, 3);
  const overflowActions = actions.slice(3);

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-3 px-4 py-3',
        'bg-slate-900 dark:bg-slate-800 text-white',
        'rounded-xl shadow-2xl border border-slate-700',
        'animate-in slide-in-from-bottom-4 duration-300',
        className
      )}
    >
      {/* Selection count */}
      <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
        <CheckCircle className="h-4 w-4 text-blue-400" />
        <span className="text-sm font-medium">
          {selectedCount} / {totalCount} {entityName}
        </span>
      </div>

      {/* Primary actions */}
      <div className="flex items-center gap-2">
        {primaryActions.map((action) => {
          const Icon = action.icon;
          const isLoading = loadingAction === action.id;

          return (
            <Button
              key={action.id}
              variant={action.variant === 'destructive' ? 'destructive' : 'secondary'}
              size="sm"
              onClick={() => handleAction(action)}
              disabled={action.disabled || loading || isLoading}
              className={cn(
                'h-8',
                action.variant === 'warning' && 'bg-yellow-600 hover:bg-yellow-700 text-white'
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : Icon ? (
                <Icon className="h-4 w-4 mr-1.5" />
              ) : null}
              {action.label}
            </Button>
          );
        })}

        {/* Overflow menu */}
        {overflowActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {overflowActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <React.Fragment key={action.id}>
                    {index > 0 && action.variant === 'destructive' && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      onClick={() => handleAction(action)}
                      disabled={action.disabled || loading}
                      className={cn(
                        action.variant === 'destructive' && 'text-red-600 focus:text-red-600',
                        action.variant === 'warning' && 'text-yellow-600 focus:text-yellow-600'
                      )}
                    >
                      {Icon && <Icon className="h-4 w-4 mr-2" />}
                      {action.label}
                    </DropdownMenuItem>
                  </React.Fragment>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Clear selection */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="h-8 text-slate-400 hover:text-white hover:bg-slate-700"
      >
        <X className="h-4 w-4 mr-1.5" />
        Bỏ chọn
      </Button>
    </div>
  );
}

// Pre-built common actions
export const createDeleteAction = (onDelete: (ids: string[]) => Promise<void>): BulkAction => ({
  id: 'delete',
  label: 'Xóa',
  icon: Trash2,
  variant: 'destructive',
  requireConfirm: true,
  confirmMessage: 'Bạn có chắc muốn xóa các mục đã chọn? Hành động này không thể hoàn tác.',
  onClick: onDelete,
});

export const createExportAction = (onExport: (ids: string[]) => Promise<void>): BulkAction => ({
  id: 'export',
  label: 'Xuất Excel',
  icon: Download,
  onClick: onExport,
});

export const createArchiveAction = (onArchive: (ids: string[]) => Promise<void>): BulkAction => ({
  id: 'archive',
  label: 'Lưu trữ',
  icon: Archive,
  onClick: onArchive,
});

export const createUpdateStatusAction = (
  label: string,
  status: string,
  onUpdate: (ids: string[], status: string) => Promise<void>
): BulkAction => ({
  id: `status-${status}`,
  label,
  icon: Tag,
  onClick: (ids) => onUpdate(ids, status),
});
