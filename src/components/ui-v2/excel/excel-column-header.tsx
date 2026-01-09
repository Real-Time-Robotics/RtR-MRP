'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { getColumnLetter, formatColumnHeader } from './excel-theme';

// =============================================================================
// EXCEL COLUMN HEADER COMPONENT
// Column headers styled like Microsoft Excel (A, B, C or field names)
// =============================================================================

export interface ExcelColumnHeaderProps {
  columnIndex: number;
  columnKey: string;
  headerText: string;
  style?: 'alpha' | 'field-names' | 'combined';
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
  width?: string;
  className?: string;
}

export function ExcelColumnHeader({
  columnIndex,
  columnKey,
  headerText,
  style = 'field-names',
  sortable = false,
  sortDirection = null,
  onSort,
  width,
  className,
}: ExcelColumnHeaderProps) {
  const displayText = formatColumnHeader(columnIndex, headerText, style);

  return (
    <div
      onClick={sortable ? onSort : undefined}
      style={{ width }}
      className={cn(
        // Base styles
        'px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider',
        'border-r border-[#217346]/20 last:border-r-0',
        // Colors
        'bg-[#E2EFDA] dark:bg-[#217346]/20',
        'text-[#217346] dark:text-[#70AD47]',
        // Interactive
        sortable && 'cursor-pointer hover:bg-[#d5e8cc] dark:hover:bg-[#217346]/30 select-none',
        className
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate">{displayText}</span>
        {sortable && sortDirection && (
          <span className="flex-shrink-0">
            {sortDirection === 'asc' ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </span>
        )}
      </div>
    </div>
  );
}

// Header row component
export interface ExcelHeaderRowProps {
  columns: Array<{
    key: string;
    header: string;
    width?: string;
    sortable?: boolean;
  }>;
  style?: 'alpha' | 'field-names' | 'combined';
  showRowNumbers?: boolean;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: (columnKey: string) => void;
  className?: string;
}

export function ExcelHeaderRow({
  columns,
  style = 'field-names',
  showRowNumbers = true,
  sortColumn,
  sortDirection,
  onSort,
  className,
}: ExcelHeaderRowProps) {
  return (
    <div
      className={cn(
        'flex',
        'bg-[#E2EFDA] dark:bg-[#217346]/20',
        'border-b border-[#217346]/30',
        className
      )}
    >
      {/* Row number header cell */}
      {showRowNumbers && (
        <div className="w-10 min-w-[40px] border-r border-[#217346]/20" />
      )}

      {/* Column headers */}
      {columns.map((col, index) => (
        <ExcelColumnHeader
          key={col.key}
          columnIndex={index}
          columnKey={col.key}
          headerText={col.header}
          style={style}
          width={col.width}
          sortable={col.sortable}
          sortDirection={sortColumn === col.key ? sortDirection : null}
          onSort={() => onSort?.(col.key)}
        />
      ))}
    </div>
  );
}

export default ExcelColumnHeader;
