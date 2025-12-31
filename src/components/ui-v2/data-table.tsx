'use client';

import React, { useState, useMemo, useCallback } from 'react';
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
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';

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
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50 rounded-b-xl">
      {/* Info */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-600">
          Showing <span className="font-medium">{startItem}</span> to{' '}
          <span className="font-medium">{endItem}</span> of{' '}
          <span className="font-medium">{formatNumber(totalItems)}</span> results
        </span>
        
        {/* Page size select */}
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-500"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 text-slate-600 hover:bg-slate-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
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
                  : 'text-slate-600 hover:bg-slate-200'
              )}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 text-slate-600 hover:bg-slate-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
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
    return <ChevronsUpDown className="h-4 w-4 text-slate-400" />;
  }
  return direction === 'asc' ? (
    <ChevronUp className="h-4 w-4 text-primary-600" />
  ) : (
    <ChevronDown className="h-4 w-4 text-primary-600" />
  );
};

// Main DataTable component
function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField = 'id',
  loading = false,
  emptyMessage = 'No data available',
  selectable = false,
  selectedKeys = new Set(),
  onSelectionChange,
  onRowClick,
  pagination = true,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  searchable = true,
  searchPlaceholder = 'Search...',
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
}: DataTableProps<T>) {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(columns.filter((c) => !c.hidden).map((c) => c.key))
  );

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
    <div className={cn('bg-white rounded-xl border border-slate-200 overflow-hidden', className)}>
      {/* Header */}
      {(searchable || columnToggle || headerActions) && (
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-4">
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
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {columnToggle && (
              <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                <Columns3 className="h-4 w-4" />
              </button>
            )}
            {headerActions}
          </div>
        </div>
      )}

      {/* Table */}
      <div
        className={cn('overflow-auto', maxHeight && `max-h-[${maxHeight}]`)}
        style={{ maxHeight }}
      >
        <table className="w-full">
          <thead className={cn(stickyHeader && 'sticky top-0 z-10')}>
            <tr className="bg-slate-50">
              {/* Selection checkbox */}
              {selectable && (
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected && !allSelected;
                    }}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
              )}

              {/* Column headers */}
              {activeColumns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider',
                    'border-b border-slate-200',
                    column.sortable && 'cursor-pointer select-none hover:bg-slate-100',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                  style={{
                    width: column.width,
                    minWidth: column.minWidth,
                  }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    <span>{column.header}</span>
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
                  colSpan={activeColumns.length + (selectable ? 1 : 0)}
                  className="px-4 py-12 text-center"
                >
                  <div className="flex items-center justify-center gap-2 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={activeColumns.length + (selectable ? 1 : 0)}
                  className="px-4 py-12 text-center text-slate-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => {
                const rowKey = String(row[keyField]);
                const isSelected = selectedKeys.has(rowKey);

                return (
                  <tr
                    key={rowKey}
                    className={cn(
                      'transition-colors',
                      striped && rowIndex % 2 === 1 && 'bg-slate-50/50',
                      isSelected && 'bg-primary-50',
                      onRowClick && 'cursor-pointer hover:bg-slate-50',
                      !isSelected && 'hover:bg-slate-50'
                    )}
                    onClick={() => onRowClick?.(row, rowIndex)}
                  >
                    {/* Selection checkbox */}
                    {selectable && (
                      <td className="w-12 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(row)}
                          className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
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
                            'px-4 text-sm text-slate-700',
                            compact ? 'py-2' : 'py-3',
                            bordered && 'border-b border-slate-100',
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
              <tr className="bg-slate-50 border-t border-slate-200">
                {selectable && <td className="px-4 py-3" />}
                {activeColumns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-4 py-3 text-sm font-medium text-slate-700',
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

      {/* Pagination */}
      {pagination && totalPages > 0 && (
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
    </div>
  );
}

DataTable.displayName = 'DataTable';

// =============================================================================
// EXPORTS
// =============================================================================

export { DataTable, TablePagination };
export default DataTable;
