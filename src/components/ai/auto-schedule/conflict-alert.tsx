'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  AlertCircle,
  XCircle,
  Info,
  ChevronRight,
  Wand2,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ConflictAlertData {
  id: string;
  type: string;
  severity: ConflictSeverity;
  title: string;
  description: string;
  affectedWorkOrders: Array<{
    id: string;
    workOrderNumber: string;
  }>;
  suggestedResolution?: string;
}

export interface ConflictAlertProps {
  conflict: ConflictAlertData;
  onResolve?: (conflictId: string) => void;
  onViewDetails?: (conflictId: string) => void;
  className?: string;
}

// =============================================================================
// CONFLICT ALERT COMPONENT
// =============================================================================

export function ConflictAlert({
  conflict,
  onResolve,
  onViewDetails,
  className,
}: ConflictAlertProps) {
  const getSeverityConfig = (severity: ConflictSeverity) => {
    switch (severity) {
      case 'critical':
        return {
          icon: XCircle,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-700',
          iconColor: 'text-red-500',
          label: 'Nghiêm trọng',
        };
      case 'high':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          textColor: 'text-orange-700',
          iconColor: 'text-orange-500',
          label: 'Cao',
        };
      case 'medium':
        return {
          icon: AlertCircle,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-700',
          iconColor: 'text-yellow-500',
          label: 'Trung bình',
        };
      default:
        return {
          icon: Info,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-700',
          iconColor: 'text-blue-500',
          label: 'Thấp',
        };
    }
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      overlap: 'Chồng chéo lịch',
      overload: 'Quá tải công suất',
      material_shortage: 'Thiếu nguyên liệu',
      due_date_risk: 'Rủi ro trễ hạn',
      resource_unavailable: 'Tài nguyên không khả dụng',
      predecessor_violation: 'Vi phạm thứ tự',
    };
    return labels[type] || type;
  };

  const config = getSeverityConfig(conflict.severity);
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={cn('flex-shrink-0 mt-0.5', config.iconColor)}>
          <Icon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h4 className={cn('font-medium', config.textColor)}>
                  {conflict.title}
                </h4>
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    config.bgColor,
                    config.textColor,
                    'border',
                    config.borderColor
                  )}
                >
                  {config.label}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {getTypeLabel(conflict.type)}
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="mt-2 text-sm text-gray-600">{conflict.description}</p>

          {/* Affected work orders */}
          {conflict.affectedWorkOrders.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {conflict.affectedWorkOrders.slice(0, 3).map((wo) => (
                <span
                  key={wo.id}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white border"
                >
                  {wo.workOrderNumber}
                </span>
              ))}
              {conflict.affectedWorkOrders.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{conflict.affectedWorkOrders.length - 3} khác
                </span>
              )}
            </div>
          )}

          {/* Suggested resolution */}
          {conflict.suggestedResolution && (
            <div className="mt-2 p-2 bg-white rounded border text-sm">
              <span className="text-gray-500">Đề xuất: </span>
              <span>{conflict.suggestedResolution}</span>
            </div>
          )}

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2">
            {onResolve && (
              <Button
                size="sm"
                variant="default"
                className="h-7"
                onClick={() => onResolve(conflict.id)}
              >
                <Wand2 className="h-3 w-3 mr-1" />
                Giải quyết
              </Button>
            )}
            {onViewDetails && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7"
                onClick={() => onViewDetails(conflict.id)}
              >
                Chi tiết
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CONFLICT LIST COMPONENT
// =============================================================================

export interface ConflictListProps {
  conflicts: ConflictAlertData[];
  onResolve?: (conflictId: string) => void;
  onViewDetails?: (conflictId: string) => void;
  onResolveAll?: () => void;
  className?: string;
}

export function ConflictList({
  conflicts,
  onResolve,
  onViewDetails,
  onResolveAll,
  className,
}: ConflictListProps) {
  const sortedConflicts = [...conflicts].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  const criticalCount = conflicts.filter((c) => c.severity === 'critical').length;
  const highCount = conflicts.filter((c) => c.severity === 'high').length;

  if (conflicts.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
          <AlertCircle className="h-6 w-6 text-green-600" />
        </div>
        <p className="text-gray-500">Không phát hiện xung đột</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-medium">{conflicts.length} xung đột</span>
          {criticalCount > 0 && (
            <span className="text-red-600">{criticalCount} nghiêm trọng</span>
          )}
          {highCount > 0 && (
            <span className="text-orange-600">{highCount} cao</span>
          )}
        </div>
        {onResolveAll && conflicts.length > 1 && (
          <Button size="sm" variant="outline" onClick={onResolveAll}>
            <Wand2 className="h-3 w-3 mr-1" />
            Giải quyết tất cả
          </Button>
        )}
      </div>

      {/* Conflict cards */}
      <div className="space-y-3">
        {sortedConflicts.map((conflict) => (
          <ConflictAlert
            key={conflict.id}
            conflict={conflict}
            onResolve={onResolve}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </div>
  );
}

export default ConflictAlert;
