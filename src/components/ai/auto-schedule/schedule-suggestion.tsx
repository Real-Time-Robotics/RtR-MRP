'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  ArrowRight,
  Clock,
  TrendingUp,
  AlertTriangle,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

// =============================================================================
// TYPES
// =============================================================================

export interface ScheduleChange {
  workOrderId: string;
  workOrderNumber: string;
  field: 'startDate' | 'endDate' | 'workCenter' | 'priority';
  oldValue: string | Date;
  newValue: string | Date;
}

export interface ScheduleSuggestionData {
  id: string;
  title: string;
  description: string;
  type: 'optimization' | 'conflict_resolution' | 'capacity_balance' | 'deadline_risk';
  confidence: number;
  changes: ScheduleChange[];
  metrics: {
    utilizationImprovement?: number;
    conflictsResolved?: number;
    leadTimeReduction?: number;
    onTimeDeliveryImprovement?: number;
  };
  reasoning?: string;
}

export interface ScheduleSuggestionProps {
  suggestion: ScheduleSuggestionData;
  onAccept?: (suggestionId: string) => void;
  onReject?: (suggestionId: string) => void;
  onViewDetails?: (suggestionId: string) => void;
  isApplying?: boolean;
  className?: string;
}

// =============================================================================
// SCHEDULE SUGGESTION COMPONENT
// =============================================================================

export function ScheduleSuggestion({
  suggestion,
  onAccept,
  onReject,
  onViewDetails,
  isApplying = false,
  className,
}: ScheduleSuggestionProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const getTypeConfig = (type: ScheduleSuggestionData['type']) => {
    switch (type) {
      case 'optimization':
        return {
          icon: TrendingUp,
          label: 'Tối ưu hóa',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-500',
        };
      case 'conflict_resolution':
        return {
          icon: AlertTriangle,
          label: 'Giải quyết xung đột',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          iconColor: 'text-orange-500',
        };
      case 'capacity_balance':
        return {
          icon: TrendingUp,
          label: 'Cân bằng công suất',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-500',
        };
      case 'deadline_risk':
        return {
          icon: Clock,
          label: 'Rủi ro deadline',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-500',
        };
      default:
        return {
          icon: Sparkles,
          label: 'Đề xuất',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          iconColor: 'text-purple-500',
        };
    }
  };

  const formatChangeValue = (field: string, value: string | Date): string => {
    if (value instanceof Date) {
      return format(value, 'dd/MM/yyyy', { locale: vi });
    }
    return String(value);
  };

  const config = getTypeConfig(suggestion.type);
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
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn('flex-shrink-0 p-2 rounded-lg', config.bgColor)}>
          <Icon className={cn('h-5 w-5', config.iconColor)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                config.bgColor,
                'border',
                config.borderColor
              )}
            >
              {config.label}
            </span>
            <span className="text-xs text-gray-500">
              {(suggestion.confidence * 100).toFixed(0)}% tin cậy
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">{suggestion.description}</p>

          {/* Metrics */}
          <div className="mt-3 flex flex-wrap gap-3">
            {suggestion.metrics.utilizationImprovement !== undefined && (
              <div className="flex items-center gap-1 text-sm">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-green-600">
                  +{suggestion.metrics.utilizationImprovement.toFixed(1)}% hiệu suất
                </span>
              </div>
            )}
            {suggestion.metrics.conflictsResolved !== undefined && (
              <div className="flex items-center gap-1 text-sm">
                <Check className="h-4 w-4 text-blue-500" />
                <span className="text-blue-600">
                  {suggestion.metrics.conflictsResolved} xung đột giải quyết
                </span>
              </div>
            )}
            {suggestion.metrics.leadTimeReduction !== undefined && (
              <div className="flex items-center gap-1 text-sm">
                <Clock className="h-4 w-4 text-purple-500" />
                <span className="text-purple-600">
                  -{suggestion.metrics.leadTimeReduction.toFixed(1)}% thời gian
                </span>
              </div>
            )}
            {suggestion.metrics.onTimeDeliveryImprovement !== undefined && (
              <div className="flex items-center gap-1 text-sm">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="text-emerald-600">
                  +{suggestion.metrics.onTimeDeliveryImprovement.toFixed(1)}% đúng hạn
                </span>
              </div>
            )}
          </div>

          {/* Expandable changes section */}
          {suggestion.changes.length > 0 && (
            <div className="mt-3">
              <button
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {suggestion.changes.length} thay đổi
              </button>

              {isExpanded && (
                <div className="mt-2 space-y-2">
                  {suggestion.changes.slice(0, 5).map((change, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm bg-white/50 rounded p-2"
                    >
                      <span className="font-medium">{change.workOrderNumber}</span>
                      <span className="text-gray-500">
                        {change.field === 'startDate' && 'Ngày bắt đầu'}
                        {change.field === 'endDate' && 'Ngày kết thúc'}
                        {change.field === 'workCenter' && 'Trung tâm SX'}
                        {change.field === 'priority' && 'Độ ưu tiên'}
                      </span>
                      <span className="text-red-500 line-through">
                        {formatChangeValue(change.field, change.oldValue)}
                      </span>
                      <ArrowRight className="h-3 w-3 text-gray-400" />
                      <span className="text-green-600 font-medium">
                        {formatChangeValue(change.field, change.newValue)}
                      </span>
                    </div>
                  ))}
                  {suggestion.changes.length > 5 && (
                    <p className="text-xs text-gray-500">
                      +{suggestion.changes.length - 5} thay đổi khác
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* AI Reasoning */}
          {suggestion.reasoning && isExpanded && (
            <div className="mt-3 p-2 bg-white/50 rounded text-sm">
              <div className="flex items-center gap-1 text-gray-500 mb-1">
                <Sparkles className="h-3 w-3" />
                <span>Lý do AI:</span>
              </div>
              <p className="text-gray-600">{suggestion.reasoning}</p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex items-center gap-2">
            {onAccept && (
              <Button
                size="sm"
                className="h-8"
                onClick={() => onAccept(suggestion.id)}
                disabled={isApplying}
              >
                {isApplying ? (
                  <>
                    <span className="animate-spin mr-1">⏳</span>
                    Đang áp dụng...
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Áp dụng
                  </>
                )}
              </Button>
            )}
            {onReject && (
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => onReject(suggestion.id)}
                disabled={isApplying}
              >
                <X className="h-3 w-3 mr-1" />
                Bỏ qua
              </Button>
            )}
            {onViewDetails && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 ml-auto"
                onClick={() => onViewDetails(suggestion.id)}
              >
                Chi tiết
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SUGGESTION LIST COMPONENT
// =============================================================================

export interface SuggestionListProps {
  suggestions: ScheduleSuggestionData[];
  onAccept?: (suggestionId: string) => void;
  onReject?: (suggestionId: string) => void;
  onViewDetails?: (suggestionId: string) => void;
  onAcceptAll?: () => void;
  applyingSuggestionId?: string | null;
  className?: string;
}

export function SuggestionList({
  suggestions,
  onAccept,
  onReject,
  onViewDetails,
  onAcceptAll,
  applyingSuggestionId,
  className,
}: SuggestionListProps) {
  // Sort by confidence (highest first)
  const sortedSuggestions = [...suggestions].sort(
    (a, b) => b.confidence - a.confidence
  );

  if (suggestions.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
          <Sparkles className="h-6 w-6 text-gray-400" />
        </div>
        <p className="text-gray-500">Không có đề xuất nào</p>
        <p className="text-sm text-gray-400 mt-1">
          Lịch trình hiện tại đã tối ưu
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <span className="font-medium">{suggestions.length} đề xuất từ AI</span>
        </div>
        {onAcceptAll && suggestions.length > 1 && (
          <Button
            size="sm"
            variant="outline"
            onClick={onAcceptAll}
            disabled={!!applyingSuggestionId}
          >
            <Check className="h-3 w-3 mr-1" />
            Áp dụng tất cả
          </Button>
        )}
      </div>

      {/* Suggestion cards */}
      <div className="space-y-3">
        {sortedSuggestions.map((suggestion) => (
          <ScheduleSuggestion
            key={suggestion.id}
            suggestion={suggestion}
            onAccept={onAccept}
            onReject={onReject}
            onViewDetails={onViewDetails}
            isApplying={applyingSuggestionId === suggestion.id}
          />
        ))}
      </div>
    </div>
  );
}

export default ScheduleSuggestion;
