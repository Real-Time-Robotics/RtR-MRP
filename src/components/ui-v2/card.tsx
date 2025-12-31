'use client';

import React, { forwardRef } from 'react';
import { MoreHorizontal, ExternalLink, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// CARD COMPONENT
// Versatile container component for content grouping
// =============================================================================

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card variant */
  variant?: 'default' | 'elevated' | 'outlined' | 'ghost';
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Make card interactive (clickable) */
  interactive?: boolean;
  /** Show hover effect */
  hoverable?: boolean;
  /** Selected state */
  selected?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

const cardVariants = {
  default: 'bg-white border border-slate-200 shadow-card',
  elevated: 'bg-white shadow-lg border-0',
  outlined: 'bg-white border-2 border-slate-200 shadow-none',
  ghost: 'bg-transparent border-0 shadow-none',
};

const cardPaddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      padding = 'none',
      interactive = false,
      hoverable = false,
      selected = false,
      disabled = false,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const isClickable = interactive || onClick;

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl transition-all duration-200',
          cardVariants[variant],
          cardPaddings[padding],
          hoverable && 'hover:shadow-card-hover hover:border-slate-300',
          isClickable && 'cursor-pointer',
          isClickable && !disabled && 'hover:shadow-md hover:border-primary-200 active:scale-[0.99]',
          selected && 'ring-2 ring-primary-500 border-primary-500',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          className
        )}
        onClick={!disabled ? onClick : undefined}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable && !disabled ? 0 : undefined}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// =============================================================================
// CARD HEADER
// =============================================================================

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Header title */
  title?: string;
  /** Subtitle */
  subtitle?: string;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Actions (buttons, menu, etc.) */
  actions?: React.ReactNode;
  /** Show border */
  bordered?: boolean;
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, subtitle, icon, actions, bordered = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-6 py-4 flex items-center justify-between',
          bordered && 'border-b border-slate-100',
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex-shrink-0 text-slate-400">{icon}</div>
          )}
          <div>
            {title && (
              <h3 className="text-base font-semibold text-slate-900">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
            )}
            {children}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

// =============================================================================
// CARD BODY
// =============================================================================

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Padding size */
  padding?: 'sm' | 'md' | 'lg';
}

const cardBodyPaddings = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className, padding = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardBodyPaddings[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardBody.displayName = 'CardBody';

// =============================================================================
// CARD FOOTER
// =============================================================================

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show border */
  bordered?: boolean;
  /** Justify content */
  justify?: 'start' | 'center' | 'end' | 'between';
}

const footerJustify = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
};

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, bordered = true, justify = 'end', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-6 py-4 flex items-center gap-3',
          bordered && 'border-t border-slate-100 bg-slate-50 rounded-b-xl',
          footerJustify[justify],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

// =============================================================================
// STAT CARD
// Card specifically for displaying statistics
// =============================================================================

export interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  iconColor?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  trend?: 'up' | 'down' | 'neutral';
  href?: string;
  onClick?: () => void;
  className?: string;
}

const iconBgColors = {
  primary: 'bg-primary-100 text-primary-600',
  success: 'bg-success-100 text-success-600',
  warning: 'bg-warning-100 text-warning-600',
  danger: 'bg-danger-100 text-danger-600',
  info: 'bg-info-100 text-info-600',
};

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  changeLabel,
  icon,
  iconColor = 'primary',
  trend,
  href,
  onClick,
  className,
}) => {
  const actualTrend = trend || (change !== undefined ? (change > 0 ? 'up' : change < 0 ? 'down' : 'neutral') : undefined);

  return (
    <Card
      interactive={!!onClick || !!href}
      hoverable
      className={cn('p-5', className)}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        {/* Icon */}
        {icon && (
          <div className={cn('p-2.5 rounded-lg', iconBgColors[iconColor])}>
            {icon}
          </div>
        )}
        
        {/* Link indicator */}
        {(href || onClick) && (
          <ChevronRight className="h-5 w-5 text-slate-400" />
        )}
      </div>

      {/* Value */}
      <div className="mt-4">
        <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
          {value}
        </p>
        <p className="text-sm text-slate-500 mt-1">{label}</p>
      </div>

      {/* Change */}
      {change !== undefined && (
        <div className="mt-3 flex items-center gap-2">
          <span
            className={cn(
              'text-sm font-medium',
              actualTrend === 'up' && 'text-success-600',
              actualTrend === 'down' && 'text-danger-600',
              actualTrend === 'neutral' && 'text-slate-500'
            )}
          >
            {change > 0 ? '+' : ''}{change}%
          </span>
          {changeLabel && (
            <span className="text-sm text-slate-400">{changeLabel}</span>
          )}
        </div>
      )}
    </Card>
  );
};

StatCard.displayName = 'StatCard';

// =============================================================================
// LINK CARD
// Card that acts as a navigation link
// =============================================================================

export interface LinkCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: string;
  className?: string;
}

const LinkCard: React.FC<LinkCardProps> = ({
  title,
  description,
  icon,
  href,
  onClick,
  badge,
  className,
}) => {
  const content = (
    <Card
      interactive
      hoverable
      className={cn('p-4 flex items-center gap-4', className)}
      onClick={onClick}
    >
      {icon && (
        <div className="flex-shrink-0 p-2 bg-slate-100 rounded-lg text-slate-600">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-slate-900 truncate">{title}</h4>
          {badge && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-slate-500 truncate mt-0.5">{description}</p>
        )}
      </div>
      <ChevronRight className="flex-shrink-0 h-5 w-5 text-slate-400" />
    </Card>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }

  return content;
};

LinkCard.displayName = 'LinkCard';

// =============================================================================
// SECTION CARD
// Card with a section title and content
// =============================================================================

export interface SectionCardProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

const SectionCard: React.FC<SectionCardProps> = ({
  title,
  description,
  actions,
  children,
  collapsible = false,
  defaultCollapsed = false,
  className,
}) => {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

  return (
    <Card className={className}>
      <CardHeader
        title={title}
        subtitle={description}
        actions={
          <div className="flex items-center gap-2">
            {actions}
            {collapsible && (
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <ChevronRight
                  className={cn(
                    'h-5 w-5 transition-transform',
                    !collapsed && 'rotate-90'
                  )}
                />
              </button>
            )}
          </div>
        }
      />
      {!collapsed && <CardBody>{children}</CardBody>}
    </Card>
  );
};

SectionCard.displayName = 'SectionCard';

// =============================================================================
// EXPORTS
// =============================================================================

export {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  StatCard,
  LinkCard,
  SectionCard,
};
export default Card;
