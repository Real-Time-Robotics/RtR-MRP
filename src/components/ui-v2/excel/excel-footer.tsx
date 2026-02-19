'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

// =============================================================================
// EXCEL FOOTER COMPONENT
// Footer with sheet tabs like Microsoft Excel
// =============================================================================

export interface SheetTab {
  id: string;
  name: string;
  color?: string;
}

export interface ExcelFooterProps {
  sheets?: SheetTab[];
  activeSheet?: string;
  onSheetChange?: (sheetId: string) => void;
  onAddSheet?: () => void;
  totalRows: number;
  selectedCount?: number;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  className?: string;
}

export function ExcelFooter({
  sheets = [{ id: 'sheet1', name: 'Sheet1' }],
  activeSheet = 'sheet1',
  onSheetChange,
  onAddSheet,
  totalRows,
  selectedCount = 0,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  className,
}: ExcelFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between',
        'px-2 py-1.5',
        'bg-slate-50 dark:bg-gunmetal',
        'border-t border-slate-200 dark:border-industrial-slate',
        className
      )}
    >
      {/* Left: Sheet tabs */}
      <div className="flex items-center gap-1">
        {/* Navigation arrows */}
        <div className="flex items-center border-r border-slate-200 dark:border-mrp-border-light pr-2 mr-1">
          <button
            className="p-0.5 hover:bg-slate-200 dark:hover:bg-gunmetal-light rounded"
            title="Previous sheets"
            aria-label="Previous sheets"
          >
            <ChevronLeft className="h-3 w-3 text-slate-400" />
          </button>
          <button
            className="p-0.5 hover:bg-slate-200 dark:hover:bg-gunmetal-light rounded"
            title="Next sheets"
            aria-label="Next sheets"
          >
            <ChevronRight className="h-3 w-3 text-slate-400" />
          </button>
        </div>

        {/* Sheet tabs */}
        {sheets.map((sheet) => (
          <button
            key={sheet.id}
            onClick={() => onSheetChange?.(sheet.id)}
            className={cn(
              'px-3 py-1 text-[10px] font-medium rounded-t-md transition-colors',
              'border border-b-0',
              activeSheet === sheet.id
                ? 'bg-white dark:bg-steel-dark text-[#217346] dark:text-[#70AD47] border-slate-200 dark:border-mrp-border-light'
                : 'bg-slate-100 dark:bg-steel-dark/50 text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-200 dark:hover:bg-gunmetal-light'
            )}
            style={sheet.color ? { borderBottomColor: sheet.color } : undefined}
          >
            {sheet.name}
          </button>
        ))}

        {/* Add sheet button */}
        {onAddSheet && (
          <button
            onClick={onAddSheet}
            className="p-1 hover:bg-slate-200 dark:hover:bg-gunmetal-light rounded"
            title="Add sheet"
            aria-label="Add sheet"
          >
            <Plus className="h-3 w-3 text-slate-400" />
          </button>
        )}
      </div>

      {/* Center: Status info */}
      <div className="flex items-center gap-4 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
        {selectedCount > 0 && (
          <span className="text-[#217346] dark:text-[#70AD47] font-medium">
            {selectedCount} selected
          </span>
        )}
        <span>{totalRows} rows</span>
      </div>

      {/* Right: Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage <= 1}
            className={cn(
              'p-1 rounded hover:bg-slate-200 dark:hover:bg-gunmetal-light',
              currentPage <= 1 && 'opacity-50 cursor-not-allowed'
            )}
          >
            <ChevronLeft className="h-3 w-3 text-slate-500" />
          </button>
          <span className="text-[10px] text-slate-500 font-mono">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className={cn(
              'p-1 rounded hover:bg-slate-200 dark:hover:bg-gunmetal-light',
              currentPage >= totalPages && 'opacity-50 cursor-not-allowed'
            )}
          >
            <ChevronRight className="h-3 w-3 text-slate-500" />
          </button>
        </div>
      )}
    </div>
  );
}

// Simplified footer for single sheet view
export interface ExcelSimpleFooterProps {
  sheetName?: string;
  totalRows: number;
  selectedCount?: number;
  className?: string;
}

export function ExcelSimpleFooter({
  sheetName = 'Sheet1',
  totalRows,
  selectedCount = 0,
  className,
}: ExcelSimpleFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between',
        'px-2 py-1',
        'bg-slate-50 dark:bg-gunmetal',
        'border-t border-slate-200 dark:border-industrial-slate',
        className
      )}
    >
      <span className="text-[10px] text-slate-400 font-mono">
        {selectedCount > 0 ? `${selectedCount} selected • ` : ''}{totalRows} rows
      </span>
      <span className="text-[10px] text-[#217346] dark:text-[#70AD47] font-medium">
        {sheetName}
      </span>
    </div>
  );
}

export default ExcelFooter;
