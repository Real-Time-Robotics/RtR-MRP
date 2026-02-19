'use client';

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// BADGE COMPONENT
// Small status indicators and labels
// =============================================================================

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Badge variant/color */
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  /** Badge size */
  size?: 'sm' | 'md' | 'lg';
  /** Show dot indicator */
  dot?: boolean;
  /** Dot color (if different from variant) */
  dotColor?: 'success' | 'warning' | 'danger' | 'info' | 'primary';
  /** Pulsing animation for dot */
  pulse?: boolean;
  /** Icon to show before text */
  icon?: React.ReactNode;
  /** Make badge rounded pill */
  pill?: boolean;
}

const badgeVariants = {
  default: 'bg-slate-100 text-slate-700',
  primary: 'bg-primary-100 text-primary-700',
  secondary: 'bg-slate-100 text-slate-600',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  danger: 'bg-danger-100 text-danger-700',
  info: 'bg-info-100 text-info-700',
  outline: 'bg-transparent border border-slate-300 text-slate-600',
};

const badgeSizes = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

const dotColors = {
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-info-500',
  primary: 'bg-primary-500',
};

const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'md',
  dot = false,
  dotColor,
  pulse = false,
  icon,
  pill = true,
  children,
  ...props
}) => {
  // Determine dot color based on variant if not explicitly set
  const actualDotColor = dotColor || (variant === 'success' ? 'success' : variant === 'warning' ? 'warning' : variant === 'danger' ? 'danger' : variant === 'info' ? 'info' : 'primary');

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium',
        badgeVariants[variant],
        badgeSizes[size],
        pill ? 'rounded-full' : 'rounded-md',
        className
      )}
      {...props}
    >
      {/* Dot indicator */}
      {dot && (
        <span className="relative mr-1.5">
          <span
            className={cn(
              'block w-1.5 h-1.5 rounded-full',
              dotColors[actualDotColor]
            )}
          />
          {pulse && (
            <span
              className={cn(
                'absolute inset-0 w-1.5 h-1.5 rounded-full animate-ping opacity-75',
                dotColors[actualDotColor]
              )}
            />
          )}
        </span>
      )}

      {/* Icon */}
      {icon && (
        <span className="mr-1 -ml-0.5 h-3 w-3 flex-shrink-0">{icon}</span>
      )}

      {/* Text */}
      {children}
    </span>
  );
};

Badge.displayName = 'Badge';

// =============================================================================
// TAG COMPONENT
// Removable tags/chips for multi-select, filters, etc.
// =============================================================================

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Tag variant */
  variant?: 'default' | 'primary' | 'outline';
  /** Tag size */
  size?: 'sm' | 'md' | 'lg';
  /** Whether tag is removable */
  removable?: boolean;
  /** Callback when remove button is clicked */
  onRemove?: () => void;
  /** Whether tag is disabled */
  disabled?: boolean;
  /** Icon to show */
  icon?: React.ReactNode;
  /** Avatar/image to show */
  avatar?: React.ReactNode;
  /** Make tag interactive (clickable) */
  interactive?: boolean;
}

const tagVariants = {
  default: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  primary: 'bg-primary-100 text-primary-700 hover:bg-primary-200',
  outline: 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50',
};

const tagSizes = {
  sm: 'h-6 px-2 text-xs gap-1',
  md: 'h-7 px-2.5 text-sm gap-1.5',
  lg: 'h-8 px-3 text-sm gap-2',
};

const Tag: React.FC<TagProps> = ({
  className,
  variant = 'default',
  size = 'md',
  removable = false,
  onRemove,
  disabled = false,
  icon,
  avatar,
  interactive = false,
  onClick,
  children,
  ...props
}) => {
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled && onRemove) {
      onRemove();
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    if (!disabled && onClick) {
      onClick(e);
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md font-medium',
        'transition-colors duration-150',
        tagVariants[variant],
        tagSizes[size],
        disabled && 'opacity-50 cursor-not-allowed',
        interactive && !disabled && 'cursor-pointer',
        removable && 'pr-1',
        className
      )}
      onClick={interactive ? handleClick : undefined}
      {...props}
    >
      {/* Avatar */}
      {avatar && (
        <span className="-ml-1 mr-1 flex-shrink-0">{avatar}</span>
      )}

      {/* Icon */}
      {icon && (
        <span className="flex-shrink-0 h-3.5 w-3.5 -ml-0.5">{icon}</span>
      )}

      {/* Text */}
      <span className="truncate">{children}</span>

      {/* Remove button */}
      {removable && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={disabled}
          className={cn(
            'ml-1 p-0.5 rounded hover:bg-black/10 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary-500',
            disabled && 'pointer-events-none'
          )}
          aria-label="Xóa"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
};

Tag.displayName = 'Tag';

// =============================================================================
// STATUS BADGE
// Pre-configured badges for common statuses
// =============================================================================

export interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  pulse?: boolean;
  className?: string;
}

const statusConfig: Record<string, { variant: BadgeProps['variant']; dotColor: BadgeProps['dotColor']; label: string }> = {
  // Order/WO Status
  draft: { variant: 'default', dotColor: 'primary', label: 'Draft' },
  pending: { variant: 'warning', dotColor: 'warning', label: 'Pending' },
  confirmed: { variant: 'info', dotColor: 'info', label: 'Confirmed' },
  in_progress: { variant: 'primary', dotColor: 'primary', label: 'In Progress' },
  completed: { variant: 'success', dotColor: 'success', label: 'Completed' },
  cancelled: { variant: 'danger', dotColor: 'danger', label: 'Cancelled' },
  on_hold: { variant: 'warning', dotColor: 'warning', label: 'On Hold' },
  
  // Stock Status
  in_stock: { variant: 'success', dotColor: 'success', label: 'In Stock' },
  low_stock: { variant: 'warning', dotColor: 'warning', label: 'Low Stock' },
  out_of_stock: { variant: 'danger', dotColor: 'danger', label: 'Out of Stock' },
  
  // Priority
  critical: { variant: 'danger', dotColor: 'danger', label: 'Critical' },
  high: { variant: 'warning', dotColor: 'warning', label: 'High' },
  medium: { variant: 'info', dotColor: 'info', label: 'Medium' },
  low: { variant: 'default', dotColor: 'primary', label: 'Low' },
  
  // Boolean
  active: { variant: 'success', dotColor: 'success', label: 'Active' },
  inactive: { variant: 'default', dotColor: 'primary', label: 'Inactive' },
  yes: { variant: 'success', dotColor: 'success', label: 'Yes' },
  no: { variant: 'default', dotColor: 'primary', label: 'No' },
  
  // NCR/Quality
  open: { variant: 'warning', dotColor: 'warning', label: 'Open' },
  closed: { variant: 'success', dotColor: 'success', label: 'Closed' },
  resolved: { variant: 'success', dotColor: 'success', label: 'Resolved' },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showDot = true,
  pulse = false,
  className,
}) => {
  const normalizedStatus = status.toLowerCase().replace(/[\s-]/g, '_');
  const config = statusConfig[normalizedStatus] || {
    variant: 'default' as const,
    dotColor: 'primary' as const,
    label: status,
  };

  return (
    <Badge
      variant={config.variant}
      size={size}
      dot={showDot}
      dotColor={config.dotColor}
      pulse={pulse && (normalizedStatus === 'critical' || normalizedStatus === 'danger')}
      className={className}
    >
      {config.label}
    </Badge>
  );
};

StatusBadge.displayName = 'StatusBadge';

// =============================================================================
// EXPORTS
// =============================================================================

export { Badge, Tag, StatusBadge };
export default Badge;
