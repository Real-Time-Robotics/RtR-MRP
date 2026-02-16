'use client';

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  ExternalLink,
  Info,
} from 'lucide-react';
import { cn, formatNumber, formatCurrency, formatPercent } from '@/lib/utils';

// =============================================================================
// KPI CARD COMPONENT
// Data-dense card for displaying key performance indicators
// =============================================================================

export interface KPICardProps {
  /** Card title/label */
  title: string;
  /** Main value to display */
  value: string | number;
  /** Value format type */
  valueFormat?: 'number' | 'currency' | 'percent' | 'custom';
  /** Currency code if valueFormat is 'currency' */
  currency?: string;
  /** Subtitle or secondary info */
  subtitle?: string;
  /** Change value (can be positive or negative) */
  change?: number;
  /** Change period label (e.g., "vs last month") */
  changePeriod?: string;
  /** Change format */
  changeFormat?: 'percent' | 'absolute' | 'custom';
  /** Custom change text */
  changeText?: string;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Icon background color */
  iconColor?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'cyan';
  /** Sparkline data points */
  sparkline?: number[];
  /** Sparkline color */
  sparklineColor?: 'primary' | 'success' | 'warning' | 'danger';
  /** Progress value (0-100) */
  progress?: number;
  /** Progress target/goal */
  progressTarget?: number;
  /** Card variant */
  variant?: 'default' | 'compact' | 'detailed' | 'mini';
  /** Additional info tooltip */
  tooltip?: string;
  /** Link to more details */
  href?: string;
  /** Click handler */
  onClick?: () => void;
  /** Additional actions menu */
  actions?: React.ReactNode;
  /** Loading state */
  loading?: boolean;
  /** Custom className */
  className?: string;
}

const iconColors = {
  primary: 'bg-primary-100 text-primary-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  danger: 'bg-danger-100 text-danger-700',
  info: 'bg-info-100 text-info-700',
  purple: 'bg-purple-100 text-purple-700',
  cyan: 'bg-cyan-100 text-cyan-700',
};

const sparklineColors = {
  primary: '#30a46c',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

// Sparkline props interface
export interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}

// Mini sparkline component
const Sparkline: React.FC<SparklineProps> = ({
  data,
  color = '#30a46c',
  width = 80,
  height = 24,
  className,
}) => {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      preserveAspectRatio="none"
    >
      {/* Area fill */}
      <polygon
        points={areaPoints}
        fill={color}
        fillOpacity="0.1"
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={width - padding}
        cy={height - padding - ((data[data.length - 1] - min) / range) * (height - padding * 2)}
        r="2"
        fill={color}
      />
    </svg>
  );
};

// Progress bar component
const ProgressBar: React.FC<{
  value: number;
  max?: number;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
  className?: string;
}> = ({ value, max = 100, color = 'primary', showLabel = false, className }) => {
  const percent = Math.min((value / max) * 100, 100);
  
  const colors = {
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger: 'bg-danger-500',
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', colors[color])}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1 text-xs text-slate-500">
          <span>{formatNumber(value)}</span>
          <span>{formatNumber(max)}</span>
        </div>
      )}
    </div>
  );
};

// Change indicator component
const ChangeIndicator: React.FC<{
  value: number;
  format?: 'percent' | 'absolute' | 'custom';
  customText?: string;
  period?: string;
  size?: 'sm' | 'md';
}> = ({ value, format = 'percent', customText, period, size = 'md' }) => {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  
  const formattedValue = customText || (
    format === 'percent' ? `${Math.abs(value).toFixed(1)}%` :
    format === 'absolute' ? formatNumber(Math.abs(value)) :
    String(Math.abs(value))
  );

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 font-medium',
        size === 'sm' ? 'text-xs' : 'text-sm',
        isPositive && 'text-success-600',
        !isPositive && !isNeutral && 'text-danger-600',
        isNeutral && 'text-slate-500'
      )}
    >
      {isPositive ? (
        <ArrowUpRight className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      ) : isNeutral ? (
        <Minus className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      ) : (
        <ArrowDownRight className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      )}
      <span>{isPositive ? '+' : ''}{formattedValue}</span>
      {period && <span className="text-slate-400 font-normal ml-1">{period}</span>}
    </div>
  );
};

// Main KPI Card component
const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  valueFormat = 'custom',
  currency = 'USD',
  subtitle,
  change,
  changePeriod,
  changeFormat = 'percent',
  changeText,
  icon,
  iconColor = 'primary',
  sparkline,
  sparklineColor = 'primary',
  progress,
  progressTarget,
  variant = 'default',
  tooltip,
  href,
  onClick,
  actions,
  loading = false,
  className,
}) => {
  // Format value based on type
  const formattedValue = valueFormat === 'number' ? formatNumber(Number(value)) :
    valueFormat === 'currency' ? formatCurrency(Number(value), currency) :
    valueFormat === 'percent' ? formatPercent(Number(value)) :
    String(value);

  const isInteractive = onClick || href;

  // Compact variant
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'bg-white rounded-xl border border-slate-200 p-4',
          'transition-all duration-200',
          isInteractive && 'cursor-pointer hover:border-primary-200 hover:shadow-md',
          className
        )}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <div className={cn('p-2 rounded-lg', iconColors[iconColor])}>
                {icon}
              </div>
            )}
            <div>
              <p className="text-sm text-slate-500">{title}</p>
              <p className="text-xl font-semibold text-slate-900 font-mono tabular-nums">
                {loading ? <span className="animate-pulse">---</span> : formattedValue}
              </p>
            </div>
          </div>
          {change !== undefined && (
            <ChangeIndicator
              value={change}
              format={changeFormat}
              customText={changeText}
              size="sm"
            />
          )}
        </div>
      </div>
    );
  }

  // Mini variant
  if (variant === 'mini') {
    return (
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2',
          'bg-slate-50 rounded-lg',
          className
        )}
      >
        <span className="text-sm text-slate-600">{title}</span>
        <span className="text-sm font-semibold text-slate-900 font-mono">
          {loading ? '---' : formattedValue}
        </span>
      </div>
    );
  }

  // Default and detailed variants
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200 p-5',
        'transition-all duration-200',
        isInteractive && 'cursor-pointer hover:border-primary-200 hover:shadow-md',
        className
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && (
            <div className={cn('p-2 rounded-lg', iconColors[iconColor])}>
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-slate-500">{title}</span>
              {tooltip && (
                <button className="text-slate-400 hover:text-slate-500">
                  <Info className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        {(actions || href) && (
          <div className="flex items-center gap-1">
            {href && (
              <a
                href={href}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {actions}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-semibold text-slate-900 font-mono tabular-nums leading-tight">
            {loading ? (
              <span className="inline-block w-24 h-8 bg-slate-200 rounded animate-pulse" />
            ) : (
              formattedValue
            )}
          </p>
          
          {/* Subtitle */}
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}

          {/* Change indicator */}
          {change !== undefined && (
            <div className="mt-2">
              <ChangeIndicator
                value={change}
                format={changeFormat}
                customText={changeText}
                period={changePeriod}
              />
            </div>
          )}
        </div>

        {/* Sparkline */}
        {sparkline && sparkline.length > 0 && (
          <Sparkline
            data={sparkline}
            color={sparklineColors[sparklineColor]}
            className="ml-4"
          />
        )}
      </div>

      {/* Progress bar (for detailed variant) */}
      {progress !== undefined && (
        <div className="mt-4">
          <ProgressBar
            value={progress}
            max={progressTarget || 100}
            color={progress >= (progressTarget || 100) * 0.9 ? 'success' : progress >= (progressTarget || 100) * 0.5 ? 'warning' : 'primary'}
            showLabel={variant === 'detailed'}
          />
        </div>
      )}
    </div>
  );
};

KPICard.displayName = 'KPICard';

// =============================================================================
// KPI CARD GROUP
// Container for multiple KPI cards with responsive grid
// =============================================================================

export interface KPICardGroupProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

const KPICardGroup: React.FC<KPICardGroupProps> = ({
  children,
  columns = 4,
  className,
}) => {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {children}
    </div>
  );
};

KPICardGroup.displayName = 'KPICardGroup';

// =============================================================================
// EXPORTS
// =============================================================================

export { KPICard, KPICardGroup, Sparkline, ProgressBar, ChangeIndicator };
export default KPICard;
