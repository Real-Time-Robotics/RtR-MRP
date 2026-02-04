'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Check,
  Columns3,
  ArrowUpDown,
  Loader2,
  Database,
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import {
  ExcelModeConfig,
  mergeExcelConfig
} from './excel';
import {
  excelColors,
  getColumnLetter,
  formatColumnHeader
} from './excel/excel-theme';

// =============================================================================
// DATA TABLE COMPONENT
// Advanced table with sorting, filtering, pagination, and selection
// =============================================================================

export interface Column<T> {
  /** Unique column key */
  key: string;
  /** Column header label */
  header: string;
  /** Column width (CSS value) */
  width?: string;
  /** Minimum width */
  minWidth?: string;
  /** Make column sortable */
  sortable?: boolean;
  /** Custom cell renderer */
  render?: (value: any, row: T, index: number) => React.ReactNode;
  /** Cell alignment */
  align?: 'left' | 'center' | 'right';
  /** Make column sticky */
  sticky?: 'left' | 'right';
  /** Hide column by default */
  hidden?: boolean;
  /** Column data type (for formatting) */
  type?: 'text' | 'number' | 'currency' | 'percent' | 'date' | 'status' | 'custom';
  /** Accessor function if key doesn't match data */
  accessor?: (row: T) => any;
  /** Footer content */
  footer?: string | ((rows: T[]) => React.ReactNode);
}

export interface DataTableProps<T> {
  /** Table data */
  data: T[];
  /** Column definitions */
  columns: Column<T>[];
  /** Unique key field in data */
  keyField?: string;
  /** Loading state */
  loading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Enable row selection */
  selectable?: boolean;
  /** Selected row keys */
  selectedKeys?: Set<string>;
  /** Selection change callback */
  onSelectionChange?: (keys: Set<string>) => void;
  /** Row click handler */
  onRowClick?: (row: T, index: number) => void;
  /** Enable pagination */
  pagination?: boolean;
  /** Page size */
  pageSize?: number;
  /** Page size options */
  pageSizeOptions?: number[];
  /** Enable search */
  searchable?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Columns to search */
  searchColumns?: string[];
  /** Enable column visibility toggle */
  columnToggle?: boolean;
  /** Striped rows */
  striped?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Show borders */
  bordered?: boolean;
  /** Sticky header */
  stickyHeader?: boolean;
  /** Max height for scrolling */
  maxHeight?: string;
  /** Custom class */
  className?: string;
  /** Header actions */
  headerActions?: React.ReactNode;
  /** Show footer */
  showFooter?: boolean;
  /** Excel-like UI mode configuration */
  excelMode?: ExcelModeConfig;
}

// Pagination component
const TablePagination: React.FC<{
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}) => {
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-b-xl">
        {/* Info */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Hiển thị <span className="font-medium text-slate-900 dark:text-slate-200">{startItem}</span> đến{' '}
            <span className="font-medium text-slate-900 dark:text-slate-200">{endItem}</span> của{' '}
            <span className="font-medium text-slate-900 dark:text-slate-200">{formatNumber(totalItems)}</span> kết quả
          </span>

          {/* Page size select */}
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-md focus:ring-2 focus:ring-primary-500 dark:text-slate-200"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} / trang
              </option>
            ))}
          </select>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Page numbers */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  'w-8 h-8 text-sm font-medium rounded-md transition-colors',
                  currentPage === pageNum
                    ? 'bg-primary-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                )}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

// Sort indicator
const SortIndicator: React.FC<{ direction: 'asc' | 'desc' | null }> = ({ direction }) => {
  if (!direction) {
    return <ChevronsUpDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />;
  }
  return direction === 'asc' ? (
    <ChevronUp className="h-4 w-4 text-primary-600 dark:text-primary-400" />
  ) : (
    <ChevronDown className="h-4 w-4 text-primary-600 dark:text-primary-400" />
  );
};

// Main DataTable component
function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField = 'id',
  loading = false,
  emptyMessage = 'Không có dữ liệu',
  selectable = false,
  selectedKeys = new Set(),
  onSelectionChange,
  onRowClick,
  pagination = true,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  searchable = true,
  searchPlaceholder = 'Tìm kiếm...',
  searchColumns,
  columnToggle = false,
  striped = false,
  compact = false,
  bordered = false,
  stickyHeader = true,
  maxHeight,
  className,
  headerActions,
  showFooter = false,
  excelMode,
}: DataTableProps<T>) {
  // Parse Excel config
  const excelConfig = mergeExcelConfig(excelMode);
  const isExcelMode = !!excelConfig;

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(columns.filter((c) => !c.hidden).map((c) => c.key))
  );

  // Reset to page 1 when data changes (e.g., after search/filter from server)
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  // Get cell value
  const getCellValue = useCallback((row: T, column: Column<T>) => {
    if (column.accessor) {
      return column.accessor(row);
    }
    return row[column.key];
  }, []);

  // Filter data
  const filteredData = useMemo(() => {
    if (!searchQuery) return data;

    const searchLower = searchQuery.toLowerCase();
    const columnsToSearch = searchColumns || columns.map((c) => c.key);

    return data.filter((row) =>
      columnsToSearch.some((key) => {
        const value = row[key];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchLower);
      })
    );
  }, [data, searchQuery, searchColumns, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredData;

    const column = columns.find((c) => c.key === sortColumn);
    if (!column) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = getCellValue(a, column);
      const bValue = getCellValue(b, column);

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection, columns, getCellValue]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  // Keyboard Navigation
  const handleArrowNav = useCallback((direction: 'up' | 'down') => {
    if (!onSelectionChange || paginatedData.length === 0) return;

    // Find index of first selected item (if any)
    const currentKey = Array.from(selectedKeys)[0]; // Assuming single selection priority for nav
    let currentIndex = -1;

    if (currentKey) {
      currentIndex = paginatedData.findIndex(row => String(row[keyField]) === currentKey);
    }

    let nextIndex = 0;
    if (currentIndex !== -1) {
      nextIndex = direction === 'up'
        ? Math.max(0, currentIndex - 1)
        : Math.min(paginatedData.length - 1, currentIndex + 1);
    }

    const nextRow = paginatedData[nextIndex];
    if (nextRow) {
      const nextKey = String(nextRow[keyField]);
      onSelectionChange(new Set([nextKey]));

      // Optional: Scroll into view logic could go here
    }
  }, [paginatedData, selectedKeys, onSelectionChange, keyField]);

  // Use global shortcuts when this component is mounted
  // Note: This might conflict if multiple tables are on screen. 
  // Ideally, we focus the table first, but for now we'll rely on this being the main view.
  useKeyboardShortcuts({
    'ArrowUp': (e) => {
      e.preventDefault();
      handleArrowNav('up');
    },
    'ArrowDown': (e) => {
      e.preventDefault();
      handleArrowNav('down');
    }
  });

  // Handle sort
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Handle selection
  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    const allKeys = paginatedData.map((row) => String(row[keyField]));
    const allSelected = allKeys.every((key) => selectedKeys.has(key));

    if (allSelected) {
      const newKeys = new Set(selectedKeys);
      allKeys.forEach((key) => newKeys.delete(key));
      onSelectionChange(newKeys);
    } else {
      const newKeys = new Set(selectedKeys);
      allKeys.forEach((key) => newKeys.add(key));
      onSelectionChange(newKeys);
    }
  };

  const handleSelectRow = (row: T) => {
    if (!onSelectionChange) return;

    const key = String(row[keyField]);
    const newKeys = new Set(selectedKeys);

    if (newKeys.has(key)) {
      newKeys.delete(key);
    } else {
      newKeys.add(key);
    }

    onSelectionChange(newKeys);
  };

  // Visible columns
  const activeColumns = columns.filter((c) => visibleColumns.has(c.key));

  // Selection state
  const allSelected = paginatedData.length > 0 &&
    paginatedData.every((row) => selectedKeys.has(String(row[keyField])));
  const someSelected = paginatedData.some((row) => selectedKeys.has(String(row[keyField])));

  return (
    <div className={cn(
      'overflow-hidden min-w-0 flex flex-col',
      isExcelMode
        ? 'bg-white dark:bg-slate-950 rounded-md border border-[#217346]/30 dark:border-[#70AD47]/30'
        : 'bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800',
      className
    )}>
      {/* Excel Title Bar */}
      {isExcelMode && excelConfig.sheetName && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-[#217346] dark:bg-slate-800 rounded-t-md shrink-0">
          <Database className="h-3.5 w-3.5 text-white" />
          <span className="text-xs font-medium text-white">{excelConfig.sheetName}</span>
          <span className="ml-auto text-[10px] text-white/70 font-mono">
            {sortedData.length} records
          </span>
        </div>
      )}

      {/* Header */}
      {(searchable || columnToggle || headerActions) && (
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
          {/* Search */}
          {searchable && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {columnToggle && (
              <button className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <Columns3 className="h-4 w-4" />
              </button>
            )}
            {headerActions}
          </div>
        </div>
      )}

      {/* Table */}
      <div
        className="flex-1 min-h-[200px] overflow-auto"
      >
        <table className="w-full table-fixed">
          <thead className={cn(stickyHeader && 'sticky top-0 z-10')}>
            <tr className={cn(
              'backdrop-blur-sm',
              isExcelMode
                ? 'bg-[#E2EFDA] dark:bg-[#217346]/20 border-b border-[#217346]/30 dark:border-[#70AD47]/30'
                : 'bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800'
            )}>
              {/* Excel Row Number Header */}
              {isExcelMode && excelConfig.showRowNumbers && (
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
                    onChange={handleSelectAll}
                    className={cn(
                      'h-4 w-4 rounded border-slate-300 dark:border-slate-600 focus:ring-primary-500 dark:bg-slate-800',
                      isExcelMode ? 'text-[#217346]' : 'text-primary-600'
                    )}
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
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                  style={{
                    width: column.width,
                    minWidth: column.minWidth,
                  }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className={cn("flex items-center gap-1", column.align === 'right' && "justify-end", column.align === 'center' && "justify-center")}>
                    <span>
                      {isExcelMode && excelConfig.columnHeaderStyle !== 'field-names'
                        ? formatColumnHeader(colIndex, column.header, excelConfig.columnHeaderStyle)
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

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={activeColumns.length + (selectable ? 1 : 0) + (isExcelMode && excelConfig.showRowNumbers ? 1 : 0)}
                  className="px-4 py-12 text-center"
                >
                  <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={activeColumns.length + (selectable ? 1 : 0) + (isExcelMode && excelConfig.showRowNumbers ? 1 : 0)}
                  className="px-4 py-12 text-center text-slate-500 dark:text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => {
                const rowKey = String(row[keyField]);
                const isSelected = selectedKeys.has(rowKey);
                const actualRowNumber = (currentPage - 1) * pageSize + rowIndex + 1;

                return (
                  <tr
                    key={rowKey}
                    className={cn(
                      'transition-colors',
                      isExcelMode
                        ? cn(
                            'border-b border-slate-200 dark:border-slate-800',
                            'hover:bg-[#E2EFDA]/30 dark:hover:bg-[#217346]/10',
                            isSelected && 'bg-[#E2EFDA]/50 dark:bg-[#217346]/15'
                          )
                        : cn(
                            'border-b border-slate-100 dark:border-slate-800 last:border-0',
                            striped && rowIndex % 2 === 1 && 'bg-slate-50/50 dark:bg-slate-900/30',
                            isSelected && 'bg-primary-50 dark:bg-primary-900/20',
                            'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          ),
                      onRowClick && 'cursor-pointer'
                    )}
                    onClick={() => onRowClick?.(row, rowIndex)}
                  >
                    {/* Excel Row Number Cell */}
                    {isExcelMode && excelConfig.showRowNumbers && (
                      <td className={cn(
                        'w-10 min-w-[40px] px-1 text-center text-[10px] font-mono',
                        'border-r border-slate-200 dark:border-slate-800',
                        'bg-slate-50 dark:bg-slate-900',
                        isExcelMode && excelConfig.compactMode ? 'py-1' : 'py-1.5',
                        isSelected
                          ? 'bg-[#E2EFDA] dark:bg-[#217346]/20 text-[#217346] dark:text-[#70AD47] font-semibold'
                          : 'text-slate-400 dark:text-slate-500'
                      )}>
                        {actualRowNumber}
                      </td>
                    )}

                    {/* Selection checkbox */}
                    {selectable && (
                      <td className={cn(
                        'w-12 px-4',
                        isExcelMode ? 'py-1.5' : 'py-3'
                      )} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(row)}
                          className={cn(
                            'h-4 w-4 rounded border-slate-300 dark:border-slate-600 focus:ring-primary-500 dark:bg-slate-800',
                            isExcelMode ? 'text-[#217346]' : 'text-primary-600'
                          )}
                        />
                      </td>
                    )}

                    {/* Data cells */}
                    {activeColumns.map((column) => {
                      const value = getCellValue(row, column);
                      const content = column.render
                        ? column.render(value, row, rowIndex)
                        : value;

                      return (
                        <td
                          key={column.key}
                          className={cn(
                            'text-slate-700 dark:text-slate-300',
                            isExcelMode
                              ? cn(
                                  'px-2 text-[11px] font-mono',
                                  excelConfig.compactMode ? 'py-1' : 'py-1.5',
                                  'border-r border-b border-slate-200 dark:border-slate-800 last:border-r-0'
                                )
                              : cn(
                                  'px-4 text-sm',
                                  compact ? 'py-2' : 'py-3',
                                  bordered && 'border-b border-slate-100 dark:border-slate-800'
                                ),
                            column.align === 'center' && 'text-center',
                            column.align === 'right' && 'text-right',
                            column.type === 'number' && 'font-mono tabular-nums',
                            column.type === 'currency' && 'font-mono tabular-nums'
                          )}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Footer */}
          {showFooter && (
            <tfoot>
              <tr className={cn(
                'border-t',
                isExcelMode
                  ? 'bg-[#E2EFDA] dark:bg-[#217346]/20 border-[#217346]/30 dark:border-[#70AD47]/30'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              )}>
                {isExcelMode && excelConfig.showRowNumbers && <td className="px-1 py-2" />}
                {selectable && <td className="px-4 py-3" />}
                {activeColumns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'font-medium text-slate-700 dark:text-slate-300',
                      isExcelMode
                        ? 'px-2 py-1.5 text-[10px] text-[#217346] dark:text-[#70AD47]'
                        : 'px-4 py-3 text-sm',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right'
                    )}
                  >
                    {typeof column.footer === 'function'
                      ? column.footer(sortedData)
                      : column.footer}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Excel-style Status Bar */}
      {isExcelMode && excelConfig.showFooter && (
        <div className="flex items-center justify-between px-2 py-1 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <span className="text-[10px] text-slate-400 font-mono">
            {selectedKeys.size > 0 ? `${selectedKeys.size} selected • ` : ''}{sortedData.length} rows
          </span>
          <span className="text-[10px] text-[#217346] dark:text-[#70AD47] font-medium">
            {excelConfig.sheetName}
          </span>
        </div>
      )}

      {/* Pagination */}
      {pagination && totalPages > 0 && !isExcelMode && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={sortedData.length}
          pageSizeOptions={pageSizeOptions}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      )}

      {/* Excel-style Pagination */}
      {pagination && totalPages > 1 && isExcelMode && (
        <div className="flex items-center justify-center gap-2 px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className={cn(
              'p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700',
              currentPage <= 1 && 'opacity-50 cursor-not-allowed'
            )}
          >
            <ChevronLeft className="h-3 w-3 text-slate-500" />
          </button>
          <span className="text-[10px] text-slate-500 font-mono">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className={cn(
              'p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700',
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

DataTable.displayName = 'DataTable';

// =============================================================================
// EXPORTS
// =============================================================================

export { DataTable, TablePagination };
export type { ExcelModeConfig };
export default DataTable;
