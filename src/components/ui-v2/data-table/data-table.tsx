'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import {
  mergeExcelConfig
} from '../excel';

// Import sub-components
import { ExcelTitleBar, DataTableToolbar, TableHeaderRow } from './data-table-header';
import { DataTableBody } from './data-table-body';
import { TablePagination, ExcelPagination } from './data-table-pagination';

import type { Column, DataTableProps } from './data-table-types';

// =============================================================================
// DATA TABLE COMPONENT
// Advanced table with sorting, filtering, pagination, and selection
// =============================================================================

// Main DataTable component
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic table row constraint must accept any value types
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
  virtualize = false,
  virtualRowHeight = 40,
}: DataTableProps<T>) {
  const { t } = useLanguage();

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

  // Virtualization
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const virtualData = virtualize ? sortedData : paginatedData;

  // Keyboard Navigation
  const handleArrowNav = useCallback((direction: 'up' | 'down') => {
    if (!onSelectionChange || paginatedData.length === 0) return;

    const currentKey = Array.from(selectedKeys)[0];
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
    }
  }, [paginatedData, selectedKeys, onSelectionChange, keyField]);

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
      'overflow-hidden min-w-0 flex flex-col flex-1',
      isExcelMode
        ? 'bg-white dark:bg-slate-950 rounded-md border border-[#217346]/30 dark:border-[#70AD47]/30'
        : 'bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800',
      className
    )}>
      {/* Excel Title Bar */}
      {isExcelMode && excelConfig.sheetName && (
        <ExcelTitleBar
          sheetName={excelConfig.sheetName}
          recordCount={sortedData.length}
          t={t}
        />
      )}

      {/* Toolbar */}
      {(searchable || headerActions) && (
        <DataTableToolbar
          searchable={searchable}
          searchQuery={searchQuery}
          searchPlaceholder={searchPlaceholder}
          onSearchChange={(query) => {
            setSearchQuery(query);
            setCurrentPage(1);
          }}
          headerActions={headerActions}
        />
      )}

      {/* Table */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-auto"
        style={virtualize ? { maxHeight: maxHeight || 'calc(100vh - 280px)' } : undefined}
      >
        <table className="w-full table-fixed">
          <TableHeaderRow
            activeColumns={activeColumns}
            isExcelMode={isExcelMode}
            excelConfig={excelConfig}
            selectable={selectable}
            allSelected={allSelected}
            someSelected={someSelected}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            stickyHeader={stickyHeader}
            onSort={handleSort}
            onSelectAll={handleSelectAll}
          />

          <DataTableBody
            loading={loading}
            activeColumns={activeColumns}
            isExcelMode={isExcelMode}
            excelConfig={excelConfig}
            selectable={selectable}
            selectedKeys={selectedKeys}
            keyField={keyField}
            striped={striped}
            compact={compact}
            bordered={bordered}
            emptyMessage={emptyMessage}
            paginatedData={paginatedData}
            virtualData={virtualData}
            virtualize={virtualize}
            currentPage={currentPage}
            pageSize={pageSize}
            showFooter={showFooter}
            sortedData={sortedData}
            onRowClick={onRowClick}
            onSelectRow={handleSelectRow}
            getCellValue={getCellValue}
            scrollContainerRef={scrollContainerRef}
            virtualRowHeight={virtualRowHeight}
            t={t}
          />
        </table>
      </div>

      {/* Excel-style Status Bar */}
      {isExcelMode && excelConfig.showFooter && (
        <div className="flex items-center justify-between px-2 py-1 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <span className="text-[10px] text-slate-400 font-mono">
            {selectedKeys.size > 0 ? `${selectedKeys.size} ${t('dataTable.selected')} \u2022 ` : ''}{virtualize ? virtualData.length : sortedData.length} {t('dataTable.rows')}
          </span>
          <span className="text-[10px] text-[#217346] dark:text-[#70AD47] font-medium">
            {excelConfig.sheetName}
          </span>
        </div>
      )}

      {/* Pagination */}
      {pagination && !virtualize && totalPages > 0 && !isExcelMode && (
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
          t={t}
        />
      )}

      {/* Excel-style Pagination */}
      {pagination && !virtualize && totalPages > 1 && isExcelMode && (
        <ExcelPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          t={t}
        />
      )}
    </div>
  );
}

DataTable.displayName = 'DataTable';

export { DataTable };
export default DataTable;
