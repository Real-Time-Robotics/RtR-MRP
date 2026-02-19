'use client';

import { useState } from 'react';
import Link from 'next/link';
import { clientLogger } from '@/lib/client-logger';
import {
  Package,
  AlertTriangle,
  AlertCircle,
  Info,
  ShoppingCart,
  RefreshCw,
  ChevronRight,
  Check,
  X,
  Truck,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReorderAlerts, ReorderAlertItem, ReorderSuggestion } from '@/hooks/use-reorder-alerts';

// =============================================================================
// REORDER ALERT PANEL
// =============================================================================

interface ReorderAlertPanelProps {
  maxItems?: number;
  showSuggestions?: boolean;
  compact?: boolean;
}

export function ReorderAlertPanel({
  maxItems = 10,
  showSuggestions = true,
  compact = false,
}: ReorderAlertPanelProps) {
  const {
    summary,
    loading,
    error,
    hasCritical,
    refresh,
    triggerCheck,
    createPR,
  } = useReorderAlerts();

  const [selectedParts, setSelectedParts] = useState<Set<string>>(new Set());
  const [creatingPR, setCreatingPR] = useState(false);
  const [prResult, setPrResult] = useState<{
    prNumber: string;
    items?: Array<unknown>;
    totalValue: number;
  } | null>(null);

  // Toggle part selection
  const toggleSelection = (partId: string) => {
    const newSelection = new Set(selectedParts);
    if (newSelection.has(partId)) {
      newSelection.delete(partId);
    } else {
      newSelection.add(partId);
    }
    setSelectedParts(newSelection);
  };

  // Select all critical/low items
  const selectAllUrgent = () => {
    if (!summary) return;
    const urgentIds = summary.items
      .filter((i) => i.status === 'CRITICAL' || i.status === 'LOW')
      .map((i) => i.partId);
    setSelectedParts(new Set(urgentIds));
  };

  // Handle create PR
  const handleCreatePR = async () => {
    if (selectedParts.size === 0) return;

    setCreatingPR(true);
    try {
      const result = await createPR(Array.from(selectedParts));
      setPrResult(result);
      setSelectedParts(new Set());
    } catch (err) {
      clientLogger.error('Failed to create PR', err);
    } finally {
      setCreatingPR(false);
    }
  };

  // Get status styling
  const getStatusStyle = (status: 'CRITICAL' | 'LOW' | 'WARNING') => {
    switch (status) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-700 dark:text-red-400',
          icon: AlertTriangle,
        };
      case 'LOW':
        return {
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-200 dark:border-orange-800',
          text: 'text-orange-700 dark:text-orange-400',
          icon: AlertCircle,
        };
      case 'WARNING':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          text: 'text-yellow-700 dark:text-yellow-400',
          icon: Info,
        };
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
        <p className="text-sm">{error}</p>
        <button
          onClick={refresh}
          className="mt-2 text-xs text-blue-500 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!summary || summary.items.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <Package className="h-10 w-10 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">Khong co canh bao ton kho</p>
        <p className="text-sm mt-1">Tat ca mat hang dang o muc an toan</p>
      </div>
    );
  }

  const displayItems = summary.items.slice(0, maxItems);

  return (
    <div className={cn('space-y-4', compact && 'space-y-2')}>
      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {summary.critical > 0 && (
            <div className="flex items-center gap-1.5 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-semibold">{summary.critical} Critical</span>
            </div>
          )}
          {summary.low > 0 && (
            <div className="flex items-center gap-1.5 text-orange-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-semibold">{summary.low} Low</span>
            </div>
          )}
          {summary.warning > 0 && (
            <div className="flex items-center gap-1.5 text-yellow-600">
              <Info className="h-4 w-4" />
              <span className="text-sm">{summary.warning} Warning</span>
            </div>
          )}
        </div>
        <button
          onClick={refresh}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Refresh"
          aria-label="Làm mới"
        >
          <RefreshCw className={cn('h-4 w-4 text-gray-500', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Action Bar */}
      {selectedParts.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <span className="text-sm text-blue-700 dark:text-blue-400">
            Da chon {selectedParts.size} mat hang
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedParts(new Set())}
              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded"
            >
              Huy
            </button>
            <button
              onClick={handleCreatePR}
              disabled={creatingPR}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {creatingPR ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShoppingCart className="h-3.5 w-3.5" />
              )}
              Tao PR
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {!compact && selectedParts.size === 0 && (summary.critical > 0 || summary.low > 0) && (
        <button
          onClick={selectAllUrgent}
          className="w-full py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg border border-dashed border-blue-300 dark:border-blue-700"
        >
          Chon tat ca mat hang can dat ({summary.critical + summary.low})
        </button>
      )}

      {/* Alert Items */}
      <div className="space-y-2">
        {displayItems.map((item) => {
          const style = getStatusStyle(item.status);
          const StatusIcon = style.icon;
          const isSelected = selectedParts.has(item.partId);

          return (
            <div
              key={item.partId}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
                style.bg,
                style.border,
                isSelected && 'ring-2 ring-blue-500'
              )}
              onClick={() => toggleSelection(item.partId)}
            >
              {/* Checkbox */}
              <div
                className={cn(
                  'flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5',
                  isSelected
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 dark:border-gray-600'
                )}
              >
                {isSelected && <Check className="h-3 w-3" />}
              </div>

              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                <StatusIcon className={cn('h-5 w-5', style.text)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {item.partNumber}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {item.partName}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded',
                      item.status === 'CRITICAL'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : item.status === 'LOW'
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    )}
                  >
                    {item.status}
                  </span>
                </div>

                {/* Details */}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" />
                    Ton: <strong className={item.currentStock <= 0 ? 'text-red-600' : ''}>
                      {item.currentStock}
                    </strong> / {item.reorderPoint}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {item.daysOfStock < 999 ? `${item.daysOfStock} ngay` : 'N/A'}
                  </span>
                  {item.preferredSupplier && (
                    <span className="flex items-center gap-1">
                      <Truck className="h-3.5 w-3.5" />
                      {item.preferredSupplier.name}
                    </span>
                  )}
                </div>

                {/* Suggestion */}
                {!compact && (
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">
                      De xuat: <strong>{item.suggestedOrderQty}</strong> units
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ~{new Intl.NumberFormat('vi-VN').format(item.estimatedCost)} VND
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more link */}
      {summary.items.length > maxItems && (
        <Link
          href="/alerts?type=inventory"
          className="flex items-center justify-center gap-1 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
        >
          Xem tat ca {summary.items.length} canh bao
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}

      {/* PR Result */}
      {prResult && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-400">
                Da tao Purchase Requisition
              </p>
              <p className="text-sm text-green-700 dark:text-green-500 mt-1">
                {prResult.prNumber} - {prResult.items?.length || 0} mat hang
              </p>
              <p className="text-xs text-green-600 dark:text-green-600 mt-1">
                Tong gia tri: {new Intl.NumberFormat('vi-VN').format(prResult.totalValue)} VND
              </p>
            </div>
            <button
              onClick={() => setPrResult(null)}
              className="ml-auto text-green-600 hover:text-green-800"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Last checked */}
      <p className="text-xs text-gray-400 text-center">
        Cap nhat: {new Date(summary.lastChecked).toLocaleString('vi-VN')}
      </p>
    </div>
  );
}

export default ReorderAlertPanel;
