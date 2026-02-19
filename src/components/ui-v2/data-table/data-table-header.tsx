'use client';

import React from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatColumnHeader } from '../excel/excel-theme';
import type { Column } from './data-table-types';
import type { ExcelModeConfig } from '../excel';

// Sort indicator
export const SortIndicator: React.FC<{ direction: 'asc' | 'desc' | null }> = ({ direction }) => {
  if (!direction) {
    return <ChevronsUpDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />;
  }
  return direction === 'asc' ? (
    <ChevronUp className="h-4 w-4 text-primary-600 dark:text-primary-400" />
  ) : (
    <ChevronDown className="h-4 w-4 text-primary-600 dark:text-primary-400" />
  );
};

// Excel Title Bar
export interface ExcelTitleBarProps {
  sheetName: string;
  recordCount: number;
  t: (key: string, params?: Record<string, string>) => string;
}

export const ExcelTitleBar: React.FC<ExcelTitleBarProps> = ({ sheetName, recordCount, t }) => {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-[#217346] dark:bg-slate-800 rounded-t-md shrink-0">
      <Database className="h-3.5 w-3.5 text-white" />
      <span className="text-xs font-medium text-white">{sheetName}</span>
      <span className="ml-auto text-[10px] text-white/70 font-mono">
        {recordCount} {t('dataTable.records')}
      </span>
    </div>
  );
};

// Search toolbar
export interface DataTableToolbarProps {
  searchable: boolean;
  searchQuery: string;
  searchPlaceholder: string;
  onSearchChange: (query: string) => void;
  headerActions?: React.ReactNode;
}

export const DataTableToolbar: React.FC<DataTableToolbarProps> = ({
  searchable,
  searchQuery,
  searchPlaceholder,
  onSearchChange,
  headerActions,
}) => {
  return (
    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
      {/* Search */}
      {searchable && (
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Tìm kiếm"
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {headerActions}
      </div>
    </div>
  );
};

// Table header row
export interface TableHeaderRowProps<T> {
  activeColumns: Column<T>[];
  isExcelMode: boolean;
  excelConfig: Required<ExcelModeConfig> | null;
  selectable: boolean;
  allSelected: boolean;
  someSelected: boolean;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc' | null;
  stickyHeader: boolean;
  onSort: (columnKey: string) => void;
  onSelectAll: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TableHeaderRow<T extends Record<string, any>>({
  activeColumns,
  isExcelMode,
  excelConfig,
  selectable,
  allSelected,
  someSelected,
  sortColumn,
  sortDirection,
  stickyHeader,
  onSort,
  onSelectAll,
}: TableHeaderRowProps<T>) {
  return (
    <thead className={cn(stickyHeader && 'sticky top-0 z-10')}>
      <tr className={cn(
        'backdrop-blur-sm',
        isExcelMode
          ? 'bg-[#E2EFDA] dark:bg-[#217346]/20 border-b border-[#217346]/30 dark:border-[#70AD47]/30'
          : 'bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800'
      )}>
        {/* Excel Row Number Header */}
        {isExcelMode && excelConfig?.showRowNumbers && (
          <th className="w-10 min-w-[40px] px-1 py-1.5 text-center text-[10px] font-semibold text-[#217346] dark:text-[#70AD47] uppercase border-r border-[#217346]/20 dark:border-[#70AD47]/20 bg-[#E2EFDA] dark:bg-[#217346]/20">
            #
          </th>
        )}

        {/* Selection checkbox */}
        {selectable && (
          <th className={cn(
            'w-12 px-4',
            isExcelMode ? 'py-1.5' : 'py-3'
          )}>
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected && !allSelected;
              }}
              onChange={onSelectAll}
              aria-label="Chọn tất cả"
              className="h-4 w-4"
            />
          </th>
        )}

        {/* Column headers */}
        {activeColumns.map((column, colIndex) => (
          <th
            key={column.key}
            className={cn(
              'text-left text-xs font-semibold uppercase tracking-wider',
              isExcelMode
                ? cn(
                    'px-2 py-1.5 text-[10px] text-[#217346] dark:text-[#70AD47]',
                    'border-r border-[#217346]/20 dark:border-[#70AD47]/20 last:border-r-0',
                    column.sortable && 'cursor-pointer select-none hover:bg-[#d5e8cc] dark:hover:bg-[#217346]/30'
                  )
                : cn(
                    'px-4 py-3 text-slate-600 dark:text-slate-400',
                    'border-b border-slate-200 dark:border-slate-800',
                    column.sortable && 'cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800'
                  ),
            )}
            style={{
              width: column.width,
              minWidth: column.minWidth,
            }}
            onClick={() => column.sortable && onSort(column.key)}
          >
            <div className="flex items-center gap-1">
              <span>
                {isExcelMode && excelConfig?.columnHeaderStyle !== 'field-names'
                  ? formatColumnHeader(colIndex, column.header, excelConfig?.columnHeaderStyle || 'field-names')
                  : column.header}
              </span>
              {column.sortable && (
                <SortIndicator
                  direction={sortColumn === column.key ? sortDirection : null}
                />
              )}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
}
