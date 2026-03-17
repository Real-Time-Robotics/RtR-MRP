'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Package, DollarSign, Clock, Users, Truck, Factory, Award,
  ChevronRight, X, Bell, Eye, EyeOff, RefreshCw, Loader2,
  Lightbulb, Target, Zap, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import { clientLogger } from '@/lib/client-logger';

// =============================================================================
// RTR AI COPILOT - PROACTIVE INSIGHTS
// Automatically analyzes data and surfaces important insights
// =============================================================================

// Types
export interface Insight {
  id: string;
  type: 'alert' | 'opportunity' | 'trend' | 'recommendation' | 'achievement';
  category: 'inventory' | 'sales' | 'production' | 'quality' | 'procurement' | 'general';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  titleVi: string;
  description: string;
  descriptionVi: string;
  metric?: {
    label: string;
    value: string | number;
    change?: number;
    changeType?: 'increase' | 'decrease' | 'neutral';
  };
  action?: {
    label: string;
    labelVi: string;
    onClick: () => void;
  };
  timestamp: Date;
  expiresAt?: Date;
  dismissed?: boolean;
}

interface ProactiveInsightsProps {
  language: 'en' | 'vi';
  module?: string;
  compact?: boolean;
  maxItems?: number;
  onInsightClick?: (insight: Insight) => void;
  refreshInterval?: number; // ms
}

// Icon map for categories
const CATEGORY_ICONS: Record<string, any> = {
  inventory: Package,
  sales: DollarSign,
  production: Factory,
  quality: Award,
  procurement: Truck,
  general: Sparkles,
};

// Priority colors
const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  medium: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  high: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

// Type icons
const TYPE_ICONS: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  alert: { icon: AlertTriangle, color: 'text-red-500' },
  opportunity: { icon: Lightbulb, color: 'text-yellow-500' },
  trend: { icon: TrendingUp, color: 'text-blue-500' },
  recommendation: { icon: Target, color: 'text-purple-500' },
  achievement: { icon: Award, color: 'text-green-500' },
};

// Returns empty array — insights will come from API when available
function generateInsights(_module?: string): Insight[] {
  return [];
}

// Individual insight card
function InsightCard({
  insight,
  language,
  compact,
  onDismiss,
  onClick,
}: {
  insight: Insight;
  language: 'en' | 'vi';
  compact?: boolean;
  onDismiss?: () => void;
  onClick?: () => void;
}) {
  const CategoryIcon = CATEGORY_ICONS[insight.category] || Sparkles;
  const { icon: TypeIcon, color: typeColor } = TYPE_ICONS[insight.type] || TYPE_ICONS.trend;
  const priorityStyle = PRIORITY_COLORS[insight.priority] || PRIORITY_COLORS.low;
  
  const title = language === 'vi' ? insight.titleVi : insight.title;
  const description = language === 'vi' ? insight.descriptionVi : insight.description;
  
  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${priorityStyle.bg} ${priorityStyle.border}`}
      >
        <div className={`p-2 rounded-lg ${priorityStyle.bg}`}>
          <TypeIcon className={`h-4 w-4 ${typeColor}`} />
        </div>
        <div className="ml-3 flex-1 min-w-0">
          <p className={`font-medium text-sm truncate ${priorityStyle.text}`}>{title}</p>
          {insight.metric && (
            <div className="flex items-center mt-0.5">
              <span className="text-xs text-gray-500">{insight.metric.value}</span>
              {insight.metric.change && (
                <span className={`ml-1.5 flex items-center text-xs ${
                  insight.metric.changeType === 'increase' ? 'text-green-600' :
                  insight.metric.changeType === 'decrease' ? 'text-red-600' :
                  'text-gray-500'
                }`}>
                  {insight.metric.changeType === 'increase' ? <ArrowUpRight className="h-3 w-3" /> :
                   insight.metric.changeType === 'decrease' ? <ArrowDownRight className="h-3 w-3" /> :
                   <Minus className="h-3 w-3" />}
                  {Math.abs(insight.metric.change)}%
                </span>
              )}
            </div>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400" />
      </div>
    );
  }
  
  return (
    <div className={`p-4 rounded-xl border transition-all hover:shadow-md ${priorityStyle.bg} ${priorityStyle.border}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <div className={`p-2 rounded-lg bg-white/80`}>
            <TypeIcon className={`h-5 w-5 ${typeColor}`} />
          </div>
          <div>
            <span className={`text-xs font-medium uppercase ${priorityStyle.text}`}>
              {insight.category}
            </span>
            {insight.priority === 'critical' || insight.priority === 'high' ? (
              <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                {language === 'vi' ? 'Ưu tiên' : 'Priority'}
              </span>
            ) : null}
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      
      {/* Content */}
      <h4 className={`mt-3 font-semibold ${priorityStyle.text}`}>{title}</h4>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
      
      {/* Metric */}
      {insight.metric && (
        <div className="mt-3 flex items-center space-x-4">
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-900">{insight.metric.value}</span>
            {insight.metric.change && (
              <span className={`ml-2 flex items-center text-sm font-medium ${
                insight.metric.changeType === 'increase' ? 'text-green-600' :
                insight.metric.changeType === 'decrease' ? 'text-red-600' :
                'text-gray-500'
              }`}>
                {insight.metric.changeType === 'increase' ? <ArrowUpRight className="h-4 w-4" /> :
                 insight.metric.changeType === 'decrease' ? <ArrowDownRight className="h-4 w-4" /> :
                 <Minus className="h-4 w-4" />}
                {Math.abs(insight.metric.change)}%
              </span>
            )}
          </div>
          <span className="text-sm text-gray-500">{insight.metric.label}</span>
        </div>
      )}
      
      {/* Action */}
      {insight.action && (
        <button
          onClick={(e) => { e.stopPropagation(); insight.action?.onClick(); }}
          className={`mt-4 flex items-center text-sm font-medium ${priorityStyle.text} hover:underline`}
        >
          {language === 'vi' ? insight.action.labelVi : insight.action.label}
          <ChevronRight className="h-4 w-4 ml-1" />
        </button>
      )}
      
      {/* Timestamp */}
      <div className="mt-3 pt-3 border-t border-gray-200/50">
        <span className="text-xs text-gray-400" suppressHydrationWarning>
          {insight.timestamp.toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}

// Main Proactive Insights Component
export default function ProactiveInsights({
  language,
  module,
  compact = false,
  maxItems = 5,
  onInsightClick,
  refreshInterval = 60000, // 1 minute
}: ProactiveInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  
  // Fetch insights
  const fetchInsights = async () => {
    setIsLoading(true);
    try {
      // In production, call API
      const data = generateInsights(module);
      setInsights(data);
    } catch (error) {
      clientLogger.error('Error fetching insights', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    fetchInsights();
  }, [module]);
  
  // Auto-refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchInsights, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);
  
  // Filter and sort insights
  const visibleInsights = insights
    .filter(i => !dismissedIds.has(i.id) && !i.dismissed)
    .sort((a, b) => {
      // Sort by priority first
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      // Then by timestamp
      return b.timestamp.getTime() - a.timestamp.getTime();
    })
    .slice(0, showAll ? undefined : maxItems);
  
  const dismissInsight = (id: string) => {
    setDismissedIds(prev => new Set([...Array.from(prev), id]));
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">
          {language === 'vi' ? 'Đang phân tích...' : 'Analyzing...'}
        </span>
      </div>
    );
  }
  
  if (visibleInsights.length === 0) {
    return (
      <div className="text-center p-8">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <h4 className="font-semibold text-gray-900">
          {language === 'vi' ? 'Mọi thứ đang tốt!' : 'All good!'}
        </h4>
        <p className="text-sm text-gray-500 mt-1">
          {language === 'vi' 
            ? 'Không có cảnh báo hoặc đề xuất nào lúc này.'
            : 'No alerts or recommendations at this time.'}
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">
            {language === 'vi' ? 'AI Insights' : 'AI Insights'}
          </h3>
          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
            {visibleInsights.length}
          </span>
        </div>
        <button
          onClick={fetchInsights}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title={language === 'vi' ? 'Làm mới' : 'Refresh'}
          aria-label={language === 'vi' ? 'Làm mới' : 'Refresh'}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      
      {/* Insights list */}
      <div className={compact ? 'space-y-2' : 'space-y-4'}>
        {visibleInsights.map(insight => (
          <InsightCard
            key={insight.id}
            insight={insight}
            language={language}
            compact={compact}
            onDismiss={() => dismissInsight(insight.id)}
            onClick={() => onInsightClick?.(insight)}
          />
        ))}
      </div>
      
      {/* Show more/less */}
      {insights.filter(i => !dismissedIds.has(i.id)).length > maxItems && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 flex items-center justify-center"
        >
          {showAll ? (
            <>
              <EyeOff className="h-4 w-4 mr-1" />
              {language === 'vi' ? 'Thu gọn' : 'Show less'}
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-1" />
              {language === 'vi' 
                ? `Xem thêm ${insights.length - maxItems} insights`
                : `Show ${insights.length - maxItems} more insights`}
            </>
          )}
        </button>
      )}
    </div>
  );
}

// Floating insights notification badge
export function InsightsBadge({
  count,
  onClick,
  position = 'top-right',
}: {
  count: number;
  onClick: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}) {
  if (count === 0) return null;
  
  const positionClasses = {
    'top-right': 'top-0 right-0 -mt-1 -mr-1',
    'top-left': 'top-0 left-0 -mt-1 -ml-1',
    'bottom-right': 'bottom-0 right-0 -mb-1 -mr-1',
    'bottom-left': 'bottom-0 left-0 -mb-1 -ml-1',
  };
  
  return (
    <button
      onClick={onClick}
      className={`absolute ${positionClasses[position]} flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse`}
    >
      {count > 99 ? '99+' : count}
    </button>
  );
}
