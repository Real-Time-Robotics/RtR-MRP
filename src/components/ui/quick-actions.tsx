'use client';

import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/lib/i18n/language-context';
import {
  Plus,
  Package,
  ShoppingCart,
  FileText,
  Calculator,
  Download,
  Upload,
  Printer,
  Settings,
  BarChart3,
  Truck,
  Factory,
  ClipboardCheck,
  ChevronRight,
  Search,
  Zap,
  ArrowRight,
  Sparkles,
  Box,
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  Clock,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// QUICK ACTIONS COMPONENT
// Thanh hành động nhanh với icons sinh động
// =============================================================================

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  labelKey: string;
  descriptionKey?: string;
  href?: string;
  onClick?: () => void;
  color: string;
  bgColor: string;
  category?: string;
  shortcut?: string;
  badge?: string | number;
}

// =============================================================================
// QUICK ACTION BAR (Horizontal)
// =============================================================================

interface QuickActionBarProps {
  actions?: QuickAction[];
  className?: string;
}

const defaultActions: QuickAction[] = [
  {
    id: 'new-order',
    icon: <Plus className="w-5 h-5" />,
    labelKey: 'quickActions.newOrder',
    descriptionKey: 'quickActions.newOrderDesc',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50',
    shortcut: 'N',
  },
  {
    id: 'inventory',
    icon: <Package className="w-5 h-5" />,
    labelKey: 'quickActions.inventory',
    descriptionKey: 'quickActions.inventoryDesc',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50',
    shortcut: 'I',
  },
  {
    id: 'mrp',
    icon: <Calculator className="w-5 h-5" />,
    labelKey: 'quickActions.runMRP',
    descriptionKey: 'quickActions.runMRPDesc',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50',
    shortcut: 'M',
  },
  {
    id: 'report',
    icon: <BarChart3 className="w-5 h-5" />,
    labelKey: 'quickActions.report',
    descriptionKey: 'quickActions.reportDesc',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50',
    shortcut: 'R',
  },
];

export function QuickActionBar({ actions = defaultActions, className }: QuickActionBarProps) {
  const { t } = useLanguage();

  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4',
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('quickActions.title')}
          </span>
        </div>
        <span className="text-xs text-gray-400">
          {t('quickActions.shortcutHint')}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl',
              'border border-transparent',
              'transition-all duration-200',
              'hover:shadow-lg hover:scale-[1.02]',
              'group',
              action.bgColor
            )}
          >
            <div className={cn(
              'p-3 rounded-xl bg-white dark:bg-gray-900 shadow-sm',
              'group-hover:shadow-md transition-shadow',
              action.color
            )}>
              {action.icon}
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {t(action.labelKey)}
            </span>
            {action.shortcut && (
              <kbd className="px-2 py-0.5 text-[10px] font-mono bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-600 text-gray-500">
                ⌘{action.shortcut}
              </kbd>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// QUICK ACTION GRID (For more actions)
// =============================================================================

interface QuickActionGridProps {
  actions: QuickAction[];
  columns?: 2 | 3 | 4 | 5 | 6;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function QuickActionGrid({
  actions,
  columns = 4,
  showLabels = true,
  size = 'md',
  className,
}: QuickActionGridProps) {
  const { t } = useLanguage();

  const sizeStyles = {
    sm: 'p-2 gap-1',
    md: 'p-3 gap-2',
    lg: 'p-4 gap-3',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className={cn(
      'grid gap-2',
      columns === 2 && 'grid-cols-2',
      columns === 3 && 'grid-cols-3',
      columns === 4 && 'grid-cols-4',
      columns === 5 && 'grid-cols-5',
      columns === 6 && 'grid-cols-6',
      className
    )}>
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={action.onClick}
          className={cn(
            'flex flex-col items-center rounded-xl',
            'border border-transparent',
            'transition-all duration-200',
            'hover:shadow-md hover:scale-[1.02]',
            'relative group',
            sizeStyles[size],
            action.bgColor
          )}
          title={action.descriptionKey ? t(action.descriptionKey) : t(action.labelKey)}
          aria-label={t(action.labelKey)}
        >
          {action.badge && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {action.badge}
            </span>
          )}

          <div className={cn(action.color)}>
            {React.cloneElement(action.icon as React.ReactElement, {
              className: iconSizes[size],
            })}
          </div>

          {showLabels && (
            <span className={cn(
              'text-gray-700 dark:text-gray-300 text-center',
              size === 'sm' && 'text-[10px]',
              size === 'md' && 'text-xs',
              size === 'lg' && 'text-sm font-medium'
            )}>
              {t(action.labelKey)}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// FLOATING ACTION BUTTON (FAB)
// =============================================================================

interface FABAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: string;
}

interface FloatingActionButtonProps {
  actions: FABAction[];
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
}

export function FloatingActionButton({
  actions,
  position = 'bottom-right',
}: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const positionStyles = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
  };

  return (
    <div className={cn('fixed z-40', positionStyles[position])}>
      {/* Action buttons */}
      <div className={cn(
        'absolute bottom-16 right-0 space-y-2 transition-all duration-300',
        isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      )}>
        {actions.map((action, index) => (
          <button
            key={action.id}
            onClick={() => {
              action.onClick();
              setIsOpen(false);
            }}
            className={cn(
              'flex items-center gap-3 px-4 py-2 rounded-full',
              'bg-white dark:bg-gray-800 shadow-lg',
              'border border-gray-200 dark:border-gray-700',
              'hover:shadow-xl transition-all duration-200',
              'group'
            )}
            style={{
              transitionDelay: `${index * 50}ms`,
            }}
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
              {action.label}
            </span>
            <div className={cn('p-2 rounded-full', action.color)}>
              {action.icon}
            </div>
          </button>
        ))}
      </div>

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-14 h-14 rounded-full',
          'bg-gradient-to-br from-blue-500 to-purple-600',
          'text-white shadow-lg shadow-purple-500/30',
          'flex items-center justify-center',
          'hover:shadow-xl hover:scale-110',
          'transition-all duration-300',
          isOpen && 'rotate-45'
        )}
        aria-label={isOpen ? 'Close actions menu' : 'Open actions menu'}
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

// =============================================================================
// STAT CARDS (KPI Cards with colors)
// =============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  subValue,
  trend,
  onClick,
  className,
}: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4',
        'hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600',
        'transition-all duration-200',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn('p-2 rounded-lg', iconBg)}>
          <span className={iconColor}>{icon}</span>
        </div>
        
        {trend && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
            trend.direction === 'up' && 'text-green-600 bg-green-50 dark:bg-green-900/30',
            trend.direction === 'down' && 'text-red-600 bg-red-50 dark:bg-red-900/30',
            trend.direction === 'neutral' && 'text-gray-600 bg-gray-50 dark:bg-gray-700'
          )}>
            {trend.direction === 'up' && <TrendingUp className="w-3 h-3" />}
            {trend.direction === 'down' && <TrendingUp className="w-3 h-3 rotate-180" />}
            {trend.value}
          </div>
        )}
      </div>
      
      <div className="mt-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        {subValue && (
          <p className="text-xs text-gray-400 mt-1">{subValue}</p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// METRIC ROW
// =============================================================================

interface MetricItem {
  id: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string | number;
  status?: 'good' | 'warning' | 'critical';
}

interface MetricRowProps {
  metrics: MetricItem[];
  className?: string;
}

export function MetricRow({ metrics, className }: MetricRowProps) {
  const statusColors = {
    good: 'border-l-green-500',
    warning: 'border-l-amber-500',
    critical: 'border-l-red-500',
  };

  return (
    <div className={cn('flex gap-4 overflow-x-auto pb-2', className)}>
      {metrics.map((metric) => (
        <div
          key={metric.id}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg',
            'bg-white dark:bg-gray-800',
            'border border-gray-200 dark:border-gray-700',
            'border-l-4',
            metric.status ? statusColors[metric.status] : 'border-l-gray-300',
            'min-w-[200px] flex-shrink-0'
          )}
        >
          <div className={cn('p-2 rounded-lg', metric.iconBg)}>
            <span className={metric.iconColor}>{metric.icon}</span>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{metric.label}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{metric.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// WELCOME BANNER
// =============================================================================

interface WelcomeBannerProps {
  userName: string;
  greeting?: string;
  subtitle?: string;
  date?: Date;
  className?: string;
}

export function WelcomeBanner({
  userName,
  greeting,
  subtitle,
  date = new Date(),
  className,
}: WelcomeBannerProps) {
  const { t, language } = useLanguage();
  const hour = date.getHours();

  const getDefaultGreeting = () => {
    if (hour < 12) return t('welcome.morning');
    if (hour < 18) return t('welcome.afternoon');
    return t('welcome.evening');
  };

  const formatDate = (d: Date) => {
    const dayKeys = ['days.sunday', 'days.monday', 'days.tuesday', 'days.wednesday', 'days.thursday', 'days.friday', 'days.saturday'];
    const dayName = t(dayKeys[d.getDay()]);

    if (language === 'vi') {
      return `${dayName}, ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
    }
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${dayName}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl',
      'bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500',
      'text-white p-6',
      className
    )}>
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 text-white/70 text-sm mb-2">
          <Calendar className="w-4 h-4" />
          {formatDate(date)}
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-1">
          {greeting || getDefaultGreeting()}, {userName}!
        </h1>

        <p className="text-white/80">
          {subtitle || t('welcome.subtitle')}
        </p>
      </div>

      {/* Sparkles decoration */}
      <Sparkles className="absolute top-4 right-4 w-8 h-8 text-white/20" />
    </div>
  );
}

export default QuickActionBar;
