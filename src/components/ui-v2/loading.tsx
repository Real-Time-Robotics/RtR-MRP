'use client';

import React from 'react';
import {
  Loader2,
  Package,
  FileText,
  Search,
  AlertCircle,
  RefreshCw,
  Plus,
  Inbox,
  Database,
  BarChart3,
  Users,
  ShoppingCart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

// =============================================================================
// LOADING COMPONENTS
// =============================================================================

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'white' | 'slate';
  className?: string;
}

const spinnerSizes = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

const spinnerColors = {
  primary: 'text-primary-600',
  white: 'text-white',
  slate: 'text-slate-400',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className,
}) => (
  <Loader2
    className={cn(
      'animate-spin',
      spinnerSizes[size],
      spinnerColors[color],
      className
    )}
  />
);

// Full page loading
export interface PageLoadingProps {
  message?: string;
  className?: string;
}

export const PageLoading: React.FC<PageLoadingProps> = ({
  message = 'Đang tải...',
  className,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center min-h-[400px] p-8',
      className
    )}
  >
    <LoadingSpinner size="lg" />
    <p className="mt-4 text-sm text-slate-500 dark:text-mrp-text-secondary">{message}</p>
  </div>
);

// Card loading overlay
export interface CardLoadingProps {
  message?: string;
}

export const CardLoading: React.FC<CardLoadingProps> = ({ message }) => (
  <div className="absolute inset-0 bg-white/80 dark:bg-steel-dark/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-xl">
    <LoadingSpinner size="md" />
    {message && <p className="mt-2 text-sm text-slate-500 dark:text-mrp-text-secondary">{message}</p>}
  </div>
);

// Inline loading
export interface InlineLoadingProps {
  text?: string;
  className?: string;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  text = 'Đang tải',
  className,
}) => (
  <span className={cn('inline-flex items-center gap-2 text-slate-500', className)}>
    <LoadingSpinner size="sm" color="slate" />
    <span className="text-sm">{text}</span>
  </span>
);

// =============================================================================
// EMPTY STATE COMPONENTS
// =============================================================================

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const emptyStateSizes = {
  sm: {
    container: 'py-8',
    icon: 'w-10 h-10',
    title: 'text-base',
    description: 'text-sm',
  },
  md: {
    container: 'py-12',
    icon: 'w-12 h-12',
    title: 'text-lg',
    description: 'text-sm',
  },
  lg: {
    container: 'py-16',
    icon: 'w-16 h-16',
    title: 'text-xl',
    description: 'text-base',
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
}) => {
  const styles = emptyStateSizes[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        styles.container,
        className
      )}
    >
      {/* Icon */}
      {icon && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-slate-100 dark:bg-gunmetal text-slate-400 dark:text-mrp-text-muted mb-4',
            styles.icon
          )}
        >
          {icon}
        </div>
      )}

      {/* Title */}
      <h3 className={cn('font-semibold text-slate-900 dark:text-mrp-text-primary mb-1', styles.title)}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          className={cn(
            'text-slate-500 dark:text-mrp-text-secondary max-w-sm mb-4',
            styles.description
          )}
        >
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-2">
          {action && (
            <Button
              variant="primary"
              size="sm"
              onClick={action.onClick}
              leftIcon={action.icon || <Plus className="h-4 w-4" />}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              size="sm"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// Pre-configured empty states
export const NoDataEmpty: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => (
  <EmptyState
    icon={<Database className="h-6 w-6" />}
    title="Không có dữ liệu"
    description="Hiện tại không có dữ liệu để hiển thị."
    action={onRefresh ? { label: 'Làm mới', onClick: onRefresh, icon: <RefreshCw className="h-4 w-4" /> } : undefined}
  />
);

export const NoResultsEmpty: React.FC<{ query?: string; onClear?: () => void }> = ({
  query,
  onClear,
}) => (
  <EmptyState
    icon={<Search className="h-6 w-6" />}
    title="Không tìm thấy kết quả"
    description={query ? `Không tìm thấy kết quả cho "${query}". Thử từ khóa khác.` : 'Thử điều chỉnh tìm kiếm hoặc bộ lọc.'}
    action={onClear ? { label: 'Xóa tìm kiếm', onClick: onClear, icon: <RefreshCw className="h-4 w-4" /> } : undefined}
  />
);

export const NoPartsEmpty: React.FC<{ onAdd?: () => void }> = ({ onAdd }) => (
  <EmptyState
    icon={<Package className="h-6 w-6" />}
    title="Chưa có sản phẩm"
    description="Bắt đầu bằng cách thêm sản phẩm đầu tiên vào kho."
    action={onAdd ? { label: 'Thêm sản phẩm', onClick: onAdd } : undefined}
  />
);

export const NoOrdersEmpty: React.FC<{ onAdd?: () => void }> = ({ onAdd }) => (
  <EmptyState
    icon={<ShoppingCart className="h-6 w-6" />}
    title="Chưa có đơn hàng"
    description="Tạo đơn hàng bán hàng đầu tiên để bắt đầu."
    action={onAdd ? { label: 'Tạo đơn hàng', onClick: onAdd } : undefined}
  />
);

export const NoCustomersEmpty: React.FC<{ onAdd?: () => void }> = ({ onAdd }) => (
  <EmptyState
    icon={<Users className="h-6 w-6" />}
    title="Chưa có khách hàng"
    description="Thêm khách hàng đầu tiên để bắt đầu bán hàng."
    action={onAdd ? { label: 'Thêm khách hàng', onClick: onAdd } : undefined}
  />
);

export const NoReportsEmpty: React.FC = () => (
  <EmptyState
    icon={<BarChart3 className="h-6 w-6" />}
    title="Chưa có báo cáo"
    description="Báo cáo sẽ xuất hiện ở đây khi bạn có đủ dữ liệu."
  />
);

// =============================================================================
// SKELETON COMPONENTS
// =============================================================================

export interface SkeletonProps {
  className?: string;
  animate?: boolean;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  animate = true,
  style,
}) => (
  <div
    className={cn(
      'bg-slate-200 dark:bg-gunmetal rounded',
      animate && 'animate-pulse',
      className
    )}
    style={style}
  />
);

// Text skeleton
export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
}> = ({ lines = 3, className }) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className={cn(
          'h-4',
          i === lines - 1 ? 'w-3/4' : 'w-full'
        )}
      />
    ))}
  </div>
);

// Avatar skeleton
export const SkeletonAvatar: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ size = 'md', className }) => {
  const sizes = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12' };
  return <Skeleton className={cn('rounded-full', sizes[size], className)} />;
};

// Card skeleton
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('bg-white dark:bg-steel-dark rounded-xl border border-slate-200 dark:border-industrial-slate p-5', className)}>
    <div className="flex items-start gap-4">
      <SkeletonAvatar />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  </div>
);

// KPI card skeleton
export const SkeletonKPICard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('bg-white dark:bg-steel-dark rounded-xl border border-slate-200 dark:border-industrial-slate p-5', className)}>
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <div className="flex-1">
        <Skeleton className="h-3 w-20 mb-2" />
        <Skeleton className="h-6 w-24" />
      </div>
    </div>
    <Skeleton className="h-3 w-16 mt-3" />
  </div>
);

// Table skeleton
export const SkeletonTable: React.FC<{
  rows?: number;
  cols?: number;
  className?: string;
}> = ({ rows = 5, cols = 4, className }) => (
  <div className={cn('bg-white dark:bg-steel-dark rounded-xl border border-slate-200 dark:border-industrial-slate overflow-hidden', className)}>
    {/* Header */}
    <div className="px-4 py-3 bg-slate-50 dark:bg-gunmetal border-b border-slate-200 dark:border-industrial-slate flex gap-4">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div
        key={rowIndex}
        className="px-4 py-3 border-b border-slate-100 dark:border-gunmetal last:border-0 flex gap-4"
      >
        {Array.from({ length: cols }).map((_, colIndex) => (
          <Skeleton
            key={colIndex}
            className={cn('h-4 flex-1', colIndex === 0 && 'w-1/4 flex-none')}
          />
        ))}
      </div>
    ))}
  </div>
);

// Chart skeleton
export const SkeletonChart: React.FC<{
  type?: 'bar' | 'line' | 'donut';
  className?: string;
}> = ({ type = 'bar', className }) => (
  <div className={cn('bg-white dark:bg-steel-dark rounded-xl border border-slate-200 dark:border-industrial-slate p-5', className)}>
    <Skeleton className="h-5 w-32 mb-4" />
    <div className="h-64 flex items-end justify-around gap-2">
      {type === 'bar' &&
        Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      {type === 'line' && (
        <div className="w-full h-full flex items-center justify-center">
          <Skeleton className="h-px w-full" />
        </div>
      )}
      {type === 'donut' && (
        <div className="w-full h-full flex items-center justify-center">
          <Skeleton className="h-40 w-40 rounded-full" />
        </div>
      )}
    </div>
  </div>
);

// Dashboard skeleton
export const SkeletonDashboard: React.FC = () => (
  <div className="p-6 space-y-6">
    {/* KPIs */}
    <div className="grid grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonKPICard key={i} />
      ))}
    </div>
    {/* Charts */}
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2">
        <SkeletonChart type="bar" />
      </div>
      <SkeletonChart type="donut" />
    </div>
    {/* Table */}
    <SkeletonTable rows={5} cols={5} />
  </div>
);

// =============================================================================
// ERROR STATE COMPONENTS
// =============================================================================

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Có lỗi xảy ra',
  message = 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.',
  onRetry,
  className,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center py-12 text-center',
      className
    )}
  >
    <div className="w-12 h-12 rounded-full bg-danger-100 dark:bg-urgent-red-dim text-danger-600 dark:text-urgent-red flex items-center justify-center mb-4">
      <AlertCircle className="h-6 w-6" />
    </div>
    <h3 className="text-lg font-semibold text-slate-900 dark:text-mrp-text-primary mb-1">{title}</h3>
    <p className="text-sm text-slate-500 dark:text-mrp-text-secondary max-w-sm mb-4">{message}</p>
    {onRetry && (
      <Button
        variant="secondary"
        size="sm"
        onClick={onRetry}
        leftIcon={<RefreshCw className="h-4 w-4" />}
      >
        Thử lại
      </Button>
    )}
  </div>
);

// Note: All components are exported inline above
