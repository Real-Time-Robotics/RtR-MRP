'use client';

/**
 * Excel Portal Table
 * Wrapper component that applies Excel-like styling to standard HTML tables
 * Used for portal pages (Customer/Supplier portals)
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Database, Table2 } from 'lucide-react';

// =============================================================================
// EXCEL PORTAL TABLE WRAPPER
// =============================================================================

export interface ExcelPortalTableProps {
  title?: string;
  subtitle?: string;
  totalRows?: number;
  sheetName?: string;
  showRowNumbers?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function ExcelPortalTable({
  title,
  subtitle,
  totalRows = 0,
  sheetName = 'Data',
  showRowNumbers = false,
  className,
  children,
}: ExcelPortalTableProps) {
  return (
    <div className={cn('flex flex-col excel-portal-table', className)}>
      {/* Excel-style Header Bar */}
      {title && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#217346] dark:bg-[#1E2530] rounded-t-lg">
          <Table2 className="h-4 w-4 text-white" />
          <span className="text-sm font-medium text-white">{title}</span>
          {subtitle && (
            <span className="ml-auto text-xs text-white/70 font-mono">
              {subtitle}
            </span>
          )}
        </div>
      )}

      {/* Table Container with Excel styling */}
      <div
        className={cn(
          'border border-[#217346]/30 dark:border-[#70AD47]/30 overflow-hidden bg-white dark:bg-steel-dark',
          title ? 'rounded-b-lg' : 'rounded-lg'
        )}
      >
        {children}
      </div>

      {/* Excel-style Footer */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-slate-100 dark:bg-gunmetal border border-t-0 border-slate-200 dark:border-industrial-slate rounded-b-lg">
        <div className="flex items-center gap-1">
          {/* Sheet tab */}
          <div className="px-3 py-1 text-[10px] font-medium text-[#217346] dark:text-[#70AD47] bg-white dark:bg-steel-dark border border-slate-200 dark:border-mrp-border-light rounded-t-md border-b-white dark:border-b-slate-800">
            {sheetName}
          </div>
        </div>
        {totalRows > 0 && (
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            {totalRows} rows
          </span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// EXCEL PORTAL TABLE STYLES (CSS Classes)
// Apply these classes to standard HTML table elements
// =============================================================================

export const excelPortalStyles = {
  // Table wrapper
  wrapper: 'excel-portal-table',

  // Table element
  table: 'w-full border-collapse',

  // Header row
  thead: 'bg-[#E2EFDA] dark:bg-[#217346]/20',

  // Header cells
  th: cn(
    'px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider',
    'text-[#217346] dark:text-[#70AD47]',
    'border-b border-r border-[#217346]/20 dark:border-[#70AD47]/20 last:border-r-0'
  ),
  thRight: 'text-right',
  thCenter: 'text-center',

  // Body
  tbody: 'divide-y divide-slate-100 dark:divide-industrial-slate',

  // Body rows
  tr: cn(
    'transition-colors',
    'hover:bg-[#E2EFDA]/30 dark:hover:bg-[#217346]/10'
  ),
  trSelected: 'bg-[#E2EFDA]/50 dark:bg-[#217346]/15',
  trStriped: 'even:bg-slate-50/50 dark:even:bg-slate-900/30',

  // Body cells
  td: cn(
    'px-4 py-2.5 text-sm',
    'border-r border-slate-100 dark:border-industrial-slate last:border-r-0'
  ),
  tdMono: 'font-mono text-xs',
  tdRight: 'text-right',
  tdCenter: 'text-center',
  tdNumber: 'text-right text-blue-600 dark:text-blue-400 font-mono',
  tdCurrency: 'text-right font-semibold text-emerald-600 dark:text-emerald-400',

  // Row number column
  rowNumber: cn(
    'w-10 px-2 py-2.5 text-center text-[10px] font-mono',
    'bg-slate-50 dark:bg-gunmetal text-slate-400 dark:text-slate-500',
    'border-r border-slate-200 dark:border-industrial-slate'
  ),

  // Footer row
  tfoot: 'bg-slate-50 dark:bg-gunmetal border-t border-slate-200 dark:border-industrial-slate',
  tfootTd: 'px-4 py-2 text-sm font-medium',
} as const;

// =============================================================================
// HELPER COMPONENT: Row with number
// =============================================================================

export interface ExcelPortalRowProps {
  index: number;
  showRowNumber?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}

export function ExcelPortalRow({
  index,
  showRowNumber = true,
  isSelected = false,
  onClick,
  className,
  children,
}: ExcelPortalRowProps) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        excelPortalStyles.tr,
        isSelected && excelPortalStyles.trSelected,
        onClick && 'cursor-pointer',
        className
      )}
    >
      {showRowNumber && (
        <td className={excelPortalStyles.rowNumber}>{index + 1}</td>
      )}
      {children}
    </tr>
  );
}

export default ExcelPortalTable;
