'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { excelClasses } from './excel-theme';

// =============================================================================
// EXCEL ROW NUMBERS COMPONENT
// Left-side row numbers like Microsoft Excel
// =============================================================================

export interface ExcelRowNumberCellProps {
  index: number;
  isSelected?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ExcelRowNumberCell({
  index,
  isSelected = false,
  isActive = false,
  onClick,
  className,
}: ExcelRowNumberCellProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        // Base styles
        'w-10 min-w-[40px] px-1 py-1.5 text-center text-[10px] font-mono',
        'border-r border-b border-slate-200 dark:border-slate-800',
        'select-none cursor-default',
        // Background
        'bg-slate-50 dark:bg-slate-900',
        // Text color
        'text-slate-400 dark:text-slate-500',
        // States
        isSelected && 'bg-[#E2EFDA] dark:bg-[#217346]/20 text-[#217346] dark:text-[#70AD47] font-semibold',
        isActive && 'bg-[#217346] dark:bg-[#70AD47] text-white font-bold',
        // Interactive
        onClick && 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800',
        className
      )}
    >
      {index + 1}
    </div>
  );
}

// Header cell for row numbers column (top-left corner)
export function ExcelRowNumberHeader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'w-10 min-w-[40px] px-1 py-1.5',
        'bg-[#E2EFDA] dark:bg-[#217346]/20',
        'border-r border-b border-[#217346]/30',
        className
      )}
    />
  );
}

// Generate row number column configuration for DataTable
export function createRowNumberColumn<T>(): {
  key: string;
  header: string;
  width: string;
  render: (value: unknown, row: T, index: number) => React.ReactNode;
} {
  return {
    key: '__rowNumber',
    header: '',
    width: '40px',
    render: (_, __, index) => (
      <ExcelRowNumberCell index={index} />
    ),
  };
}

export default ExcelRowNumberCell;
