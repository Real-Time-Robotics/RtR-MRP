'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface Column<T> {
  key: string;
  header: string;
  headerVi?: string;
  // Render function for table cell
  render?: (item: T) => React.ReactNode;
  // Render function for card view (mobile)
  renderCard?: (item: T) => React.ReactNode;
  // If true, this column is shown as primary in card view
  isPrimary?: boolean;
  // If true, this column is shown as secondary in card view
  isSecondary?: boolean;
  // If true, hide this column in card view
  hideInCard?: boolean;
  // Width class for table column
  width?: string;
  // Alignment
  align?: 'left' | 'center' | 'right';
}

export interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  language?: 'en' | 'vi';
  emptyMessage?: string;
  emptyMessageVi?: string;
  loading?: boolean;
  // Force card view even on desktop
  forceCardView?: boolean;
  // Custom card renderer
  renderCard?: (item: T) => React.ReactNode;
  // Show action arrow in card view
  showCardArrow?: boolean;
  className?: string;
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

function TableSkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: columns }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-gray-200 dark:bg-gunmetal rounded w-3/4" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="p-4 bg-white dark:bg-steel-dark border border-gray-200 dark:border-mrp-border rounded-lg animate-pulse"
        >
          <div className="h-5 bg-gray-200 dark:bg-gunmetal rounded w-1/2 mb-2" />
          <div className="h-4 bg-gray-200 dark:bg-gunmetal rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-gunmetal rounded w-1/3" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  language = 'vi',
  emptyMessage = 'No data found',
  emptyMessageVi = 'Không có dữ liệu',
  loading = false,
  forceCardView = false,
  renderCard,
  showCardArrow = true,
  className,
}: ResponsiveTableProps<T>) {
  // Get primary and secondary columns for card view
  const primaryColumn = columns.find((c) => c.isPrimary) || columns[0];
  const secondaryColumn = columns.find((c) => c.isSecondary) || columns[1];
  const metaColumns = columns.filter(
    (c) => !c.isPrimary && !c.isSecondary && !c.hideInCard
  );

  // Default card renderer
  const defaultRenderCard = (item: T) => {
    const primaryValue = primaryColumn.render
      ? primaryColumn.render(item)
      : (item as Record<string, unknown>)[primaryColumn.key];
    const secondaryValue: React.ReactNode = secondaryColumn?.render
      ? secondaryColumn.render(item)
      : secondaryColumn
        ? ((item as Record<string, unknown>)[secondaryColumn.key] as React.ReactNode)
        : null;

    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 dark:text-mrp-text-primary truncate">
            {primaryValue as React.ReactNode}
          </div>
          {secondaryValue && (
            <div className="text-sm text-gray-500 dark:text-mrp-text-secondary truncate mt-0.5">
              {secondaryValue as React.ReactNode}
            </div>
          )}
          {metaColumns.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {metaColumns.slice(0, 3).map((col) => {
                const value = col.render
                  ? col.render(item)
                  : (item as Record<string, unknown>)[col.key];
                if (!value) return null;
                return (
                  <span
                    key={col.key}
                    className="inline-flex items-center text-xs text-gray-500 dark:text-mrp-text-muted"
                  >
                    <span className="text-gray-400 dark:text-mrp-text-muted mr-1">
                      {language === 'vi' && col.headerVi ? col.headerVi : col.header}:
                    </span>
                    {value as React.ReactNode}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        {showCardArrow && onRowClick && (
          <ChevronRight className="w-5 h-5 text-gray-400 dark:text-mrp-text-muted flex-shrink-0" />
        )}
      </div>
    );
  };

  // Empty state
  if (!loading && data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-mrp-text-secondary">
          {language === 'vi' ? emptyMessageVi : emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Table View - Desktop */}
      {!forceCardView && (
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-mrp-border">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-mrp-text-muted uppercase tracking-wider',
                      column.width,
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right'
                    )}
                  >
                    {language === 'vi' && column.headerVi
                      ? column.headerVi
                      : column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-mrp-border">
              {loading ? (
                <TableSkeleton columns={columns.length} />
              ) : (
                data.map((item) => (
                  <tr
                    key={keyExtractor(item)}
                    onClick={() => onRowClick?.(item)}
                    className={cn(
                      'bg-white dark:bg-steel-dark hover:bg-gray-50 dark:hover:bg-gunmetal transition-colors',
                      onRowClick && 'cursor-pointer'
                    )}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          'px-4 py-3 text-sm text-gray-700 dark:text-mrp-text-secondary',
                          column.width,
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right'
                        )}
                      >
                        {column.render
                          ? column.render(item)
                          : String((item as Record<string, unknown>)[column.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Card View - Mobile (or when forceCardView is true) */}
      <div className={cn(forceCardView ? 'block' : 'md:hidden')}>
        {loading ? (
          <CardSkeleton />
        ) : (
          <div className="space-y-2">
            {data.map((item) => (
              <div
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  'p-4 bg-white dark:bg-steel-dark border border-gray-200 dark:border-mrp-border rounded-lg',
                  'transition-colors touch-manipulation active:scale-[0.99]',
                  onRowClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gunmetal'
                )}
              >
                {renderCard ? renderCard(item) : defaultRenderCard(item)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// HORIZONTAL SCROLL TABLE (Alternative approach)
// =============================================================================

export interface ScrollableTableProps {
  children: React.ReactNode;
  className?: string;
}

export function ScrollableTable({ children, className }: ScrollableTableProps) {
  return (
    <div className={cn('w-full overflow-x-auto -mx-4 px-4', className)}>
      <div className="min-w-[600px]">{children}</div>
    </div>
  );
}

// =============================================================================
// TABLE UTILITIES
// =============================================================================

export function TableContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-steel-dark border border-gray-200 dark:border-mrp-border rounded-lg overflow-hidden',
        className
      )}
    >
      {children}
    </div>
  );
}

export function TableHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'px-4 py-3 border-b border-gray-200 dark:border-mrp-border flex items-center justify-between gap-4',
        'flex-col sm:flex-row',
        className
      )}
    >
      {children}
    </div>
  );
}

export function TableTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        'text-lg font-semibold text-gray-900 dark:text-mrp-text-primary',
        className
      )}
    >
      {children}
    </h2>
  );
}

export function TableActions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end',
        className
      )}
    >
      {children}
    </div>
  );
}

export default ResponsiveTable;
