'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Database } from 'lucide-react';
import { ExcelModeConfig, mergeExcelConfig } from './types';
import { ExcelSimpleFooter } from './excel-footer';
import { excelClasses, getCellValueClass } from './excel-theme';

// =============================================================================
// EXCEL TABLE WRAPPER
// Wrapper component that applies Excel styling to any table content
// =============================================================================

export interface ExcelTableWrapperProps {
  title?: string;
  subtitle?: string;
  config?: ExcelModeConfig;
  totalRows?: number;
  selectedCount?: number;
  children: React.ReactNode;
  className?: string;
}

export function ExcelTableWrapper({
  title,
  subtitle,
  config,
  totalRows = 0,
  selectedCount = 0,
  children,
  className,
}: ExcelTableWrapperProps) {
  const excelConfig = mergeExcelConfig(config);

  if (!excelConfig) {
    // Not in Excel mode, render children directly
    return <>{children}</>;
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Excel-style Header Bar */}
      {title && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-[#217346] dark:bg-slate-800 rounded-t-md">
          <Database className="h-3.5 w-3.5 text-white" />
          <span className="text-xs font-medium text-white">{title}</span>
          {subtitle && (
            <span className="ml-auto text-[10px] text-white/70 font-mono">
              {subtitle}
            </span>
          )}
        </div>
      )}

      {/* Table Container */}
      <div
        className={cn(
          'border border-[#217346]/30 dark:border-[#70AD47]/30 overflow-hidden',
          title ? 'rounded-b-md' : 'rounded-md',
          excelConfig.gridBorders && 'divide-y divide-slate-200 dark:divide-slate-800'
        )}
      >
        {children}
      </div>

      {/* Excel-style Footer */}
      {excelConfig.showFooter && (
        <ExcelSimpleFooter
          sheetName={excelConfig.sheetName}
          totalRows={totalRows}
          selectedCount={selectedCount}
        />
      )}
    </div>
  );
}

// =============================================================================
// EXCEL DATA CELL
// Individual cell with Excel-style formatting
// =============================================================================

export interface ExcelDataCellProps {
  value: unknown;
  isSelected?: boolean;
  isActive?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  className?: string;
  onClick?: () => void;
}

export function ExcelDataCell({
  value,
  isSelected = false,
  isActive = false,
  align = 'left',
  width,
  className,
  onClick,
}: ExcelDataCellProps) {
  const valueClass = getCellValueClass(value);

  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return 'null';
    if (typeof val === 'boolean') return String(val);
    if (typeof val === 'number') return val.toLocaleString();
    return String(val);
  };

  return (
    <div
      onClick={onClick}
      style={{ width }}
      className={cn(
        // Base
        'px-2 py-1.5 text-[11px] font-mono truncate',
        'border-r border-b border-slate-200 dark:border-industrial-slate last:border-r-0',
        // Background
        'bg-white dark:bg-steel-dark',
        // Alignment
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        // Value type color
        valueClass,
        // States
        isSelected && 'bg-[#E2EFDA]/70 dark:bg-[#217346]/20',
        isActive && 'ring-2 ring-[#217346] dark:ring-[#70AD47] ring-inset',
        // Hover
        'hover:bg-[#E2EFDA]/30 dark:hover:bg-[#217346]/10 transition-colors',
        // Interactive
        onClick && 'cursor-pointer',
        className
      )}
      title={String(value)}
    >
      {formatValue(value)}
    </div>
  );
}

// =============================================================================
// EXCEL DATA ROW
// Row wrapper with Excel styling
// =============================================================================

export interface ExcelDataRowProps {
  index: number;
  isSelected?: boolean;
  isActive?: boolean;
  showRowNumber?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function ExcelDataRow({
  index,
  isSelected = false,
  isActive = false,
  showRowNumber = true,
  onClick,
  children,
  className,
}: ExcelDataRowProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex',
        'border-b border-slate-200 dark:border-industrial-slate last:border-b-0',
        'hover:bg-[#E2EFDA]/30 dark:hover:bg-[#217346]/10 transition-colors',
        isSelected && 'bg-[#E2EFDA]/50 dark:bg-[#217346]/15',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {/* Row number */}
      {showRowNumber && (
        <div
          className={cn(
            'w-10 min-w-[40px] px-1 py-1.5 text-center text-[10px] font-mono',
            'border-r border-slate-200 dark:border-industrial-slate',
            'bg-slate-50 dark:bg-gunmetal',
            isSelected
              ? 'bg-[#E2EFDA] dark:bg-[#217346]/20 text-[#217346] dark:text-[#70AD47] font-semibold'
              : 'text-slate-400 dark:text-slate-500'
          )}
        >
          {index + 1}
        </div>
      )}

      {/* Cell content */}
      {children}
    </div>
  );
}

export default ExcelTableWrapper;
