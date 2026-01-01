'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n/language-context';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Info,
  X,
  ChevronRight,
  Bell,
  Zap,
  Clock,
  TrendingDown,
  Package,
  ShoppingCart,
  Factory,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// ALERT BANNER COMPONENT
// Hiển thị thông báo quan trọng với màu sắc và icon trực quan
// =============================================================================

export type AlertType = 'critical' | 'warning' | 'success' | 'info';
export type AlertCategory = 'inventory' | 'orders' | 'production' | 'maintenance' | 'general';

export interface AlertItem {
  id: string;
  type: AlertType;
  category: AlertCategory;
  title: string;
  description?: string;
  count?: number;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  timestamp?: Date;
  dismissible?: boolean;
}

interface AlertBannerProps {
  alerts: AlertItem[];
  onDismiss?: (id: string) => void;
  onDismissAll?: () => void;
  maxVisible?: number;
  className?: string;
}

// Style configurations
const alertStyles: Record<AlertType, {
  bg: string;
  border: string;
  text: string;
  icon: string;
  iconBg: string;
}> = {
  critical: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-200',
    icon: 'text-red-500',
    iconBg: 'bg-red-100 dark:bg-red-900/40',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-800 dark:text-amber-200',
    icon: 'text-amber-500',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
  },
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-800 dark:text-green-200',
    icon: 'text-green-500',
    iconBg: 'bg-green-100 dark:bg-green-900/40',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-200',
    icon: 'text-blue-500',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
  },
};

const categoryIcons: Record<AlertCategory, React.ReactNode> = {
  inventory: <Package className="w-4 h-4" />,
  orders: <ShoppingCart className="w-4 h-4" />,
  production: <Factory className="w-4 h-4" />,
  maintenance: <Wrench className="w-4 h-4" />,
  general: <Bell className="w-4 h-4" />,
};

const typeIcons: Record<AlertType, React.ReactNode> = {
  critical: <AlertTriangle className="w-5 h-5" />,
  warning: <AlertCircle className="w-5 h-5" />,
  success: <CheckCircle className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
};

// =============================================================================
// SINGLE ALERT ITEM
// =============================================================================

function AlertItemComponent({
  alert,
  onDismiss,
}: {
  alert: AlertItem;
  onDismiss?: (id: string) => void;
}) {
  const style = alertStyles[alert.type];

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200',
        'hover:shadow-md',
        style.bg,
        style.border
      )}
    >
      {/* Icon */}
      <div className={cn('p-2 rounded-lg', style.iconBg, style.icon)}>
        {typeIcons[alert.type]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {/* Category badge */}
          <span className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider',
            style.iconBg,
            style.text
          )}>
            {categoryIcons[alert.category]}
            {alert.category}
          </span>
          
          {/* Count badge */}
          {alert.count && alert.count > 1 && (
            <span className={cn(
              'inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold',
              style.iconBg,
              style.text
            )}>
              {alert.count}
            </span>
          )}
        </div>
        
        <h4 className={cn('font-medium mt-1', style.text)}>
          {alert.title}
        </h4>
        
        {alert.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            {alert.description}
          </p>
        )}
      </div>

      {/* Action */}
      {alert.action && (
        <button
          onClick={alert.action.onClick}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium',
            'bg-white dark:bg-gray-800 shadow-sm',
            'hover:shadow-md transition-all duration-200',
            style.text
          )}
        >
          {alert.action.label}
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Dismiss button */}
      {alert.dismissible !== false && onDismiss && (
        <button
          onClick={() => onDismiss(alert.id)}
          className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      )}
    </div>
  );
}

// =============================================================================
// MAIN ALERT BANNER
// =============================================================================

export function AlertBanner({
  alerts,
  onDismiss,
  onDismissAll,
  maxVisible = 3,
  className,
}: AlertBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useLanguage();

  if (alerts.length === 0) return null;

  // Sort by priority: critical > warning > info > success
  const sortedAlerts = [...alerts].sort((a, b) => {
    const priority = { critical: 0, warning: 1, info: 2, success: 3 };
    return priority[a.type] - priority[b.type];
  });

  const visibleAlerts = isExpanded ? sortedAlerts : sortedAlerts.slice(0, maxVisible);
  const hiddenCount = sortedAlerts.length - maxVisible;

  // Count by type
  const criticalCount = alerts.filter((a) => a.type === 'critical').length;
  const warningCount = alerts.filter((a) => a.type === 'warning').length;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Summary header */}
      {alerts.length > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {alerts.length} {t('home.notifications')}
              </span>
            </div>

            {criticalCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs font-medium">
                <Zap className="w-3 h-3" />
                {criticalCount} {t('home.critical')}
              </span>
            )}

            {warningCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full text-xs font-medium">
                <AlertTriangle className="w-3 h-3" />
                {warningCount} {t('home.warning')}
              </span>
            )}
          </div>

          {onDismissAll && (
            <button
              onClick={onDismissAll}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              {t('home.dismissAll')}
            </button>
          )}
        </div>
      )}

      {/* Alert items */}
      <div className="space-y-2">
        {visibleAlerts.map((alert) => (
          <AlertItemComponent
            key={alert.id}
            alert={alert}
            onDismiss={onDismiss}
          />
        ))}
      </div>

      {/* Show more/less */}
      {hiddenCount > 0 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center justify-center gap-1 transition-colors"
        >
          {isExpanded ? (
            <>{t('home.collapse')}</>
          ) : (
            <>{t('home.showMore', { count: String(hiddenCount) })} {t('home.notifications')}</>
          )}
        </button>
      )}
    </div>
  );
}

// =============================================================================
// COMPACT ALERT STRIP
// =============================================================================

interface AlertStripProps {
  alerts: AlertItem[];
  onDismiss?: (id: string) => void;
}

export function AlertStrip({ alerts, onDismiss }: AlertStripProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (alerts.length === 0) return null;

  const criticalAlerts = alerts.filter((a) => a.type === 'critical');
  const displayAlerts = criticalAlerts.length > 0 ? criticalAlerts : alerts;
  const alert = displayAlerts[currentIndex % displayAlerts.length];
  const style = alertStyles[alert.type];

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-2 rounded-lg border',
      style.bg,
      style.border
    )}>
      <div className={style.icon}>
        {typeIcons[alert.type]}
      </div>
      
      <div className="flex-1 flex items-center gap-2">
        <span className={cn('font-medium text-sm', style.text)}>
          {alert.title}
        </span>
        
        {displayAlerts.length > 1 && (
          <span className="text-xs text-gray-500">
            ({currentIndex + 1}/{displayAlerts.length})
          </span>
        )}
      </div>

      {alert.action && (
        <button
          onClick={alert.action.onClick}
          className={cn(
            'text-sm font-medium flex items-center gap-1',
            style.text
          )}
        >
          {alert.action.label}
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {displayAlerts.length > 1 && (
        <button
          onClick={() => setCurrentIndex((i) => (i + 1) % displayAlerts.length)}
          className="p-1 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
      )}

      {onDismiss && (
        <button
          onClick={() => onDismiss(alert.id)}
          className="p-1 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      )}
    </div>
  );
}

// =============================================================================
// TODAY'S PRIORITIES CARD
// =============================================================================

interface PriorityItem {
  id: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface TodayPrioritiesProps {
  items: PriorityItem[];
  className?: string;
}

export function TodayPriorities({ items, className }: TodayPrioritiesProps) {
  const { t } = useLanguage();
  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4',
      className
    )}>
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
          <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('home.todayPriorities')}</h3>
          <p className="text-xs text-gray-500">{t('home.thingsToNote')}</p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            <div className={cn('p-2 rounded-lg', item.iconBg)}>
              <span className={item.iconColor}>{item.icon}</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-600 dark:text-gray-400">{item.label}</p>
              <p className="font-semibold text-gray-900 dark:text-white">{item.value}</p>
            </div>

            {item.trend && (
              <div className={cn(
                'flex items-center gap-1 text-xs font-medium',
                item.trend === 'up' && 'text-green-600',
                item.trend === 'down' && 'text-red-600',
                item.trend === 'neutral' && 'text-gray-500'
              )}>
                {item.trend === 'up' && <TrendingDown className="w-3 h-3 rotate-180" />}
                {item.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                {item.trendValue}
              </div>
            )}

            {item.action && (
              <button
                onClick={item.action.onClick}
                className="text-xs text-purple-600 dark:text-purple-400 font-medium hover:underline"
              >
                {item.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AlertBanner;
