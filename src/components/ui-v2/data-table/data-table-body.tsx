'use client';

import React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Column } from './data-table-types';
import type { ExcelModeConfig } from '../excel';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DataTableBodyProps<T extends Record<string, any>> {
  loading: boolean;
  activeColumns: Column<T>[];
  isExcelMode: boolean;
  excelConfig: Required<ExcelModeConfig> | null;
  selectable: boolean;
  selectedKeys: Set<string>;
  keyField: string;
  striped: boolean;
  compact: boolean;
  bordered: boolean;
  emptyMessage: string;
  paginatedData: T[];
  virtualData: T[];
  virtualize: boolean;
  currentPage: number;
  pageSize: number;
  showFooter: boolean;
  sortedData: T[];
  onRowClick?: (row: T, index: number) => void;
  onSelectRow: (row: T) => void;
  getCellValue: (row: T, column: Column<T>) => unknown;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  virtualRowHeight: number;
  t: (key: string, params?: Record<string, string>) => string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTableBody<T extends Record<string, any>>({
  loading,
  activeColumns,
  isExcelMode,
  excelConfig,
  selectable,
  selectedKeys,
  keyField,
  striped,
  compact,
  bordered,
  emptyMessage,
  paginatedData,
  virtualData,
  virtualize,
  currentPage,
  pageSize,
  showFooter,
  sortedData,
  onRowClick,
  onSelectRow,
  getCellValue,
  scrollContainerRef,
  virtualRowHeight,
  t,
}: DataTableBodyProps<T>) {
  const rowVirtualizer = useVirtualizer({
    count: virtualize ? virtualData.length : 0,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => virtualRowHeight,
    overscan: 10,
  });
  const totalColSpan = activeColumns.length + (selectable ? 1 : 0) + (isExcelMode && excelConfig?.showRowNumbers ? 1 : 0);

  const renderRow = (row: T, rowIndex: number, isVirtual: boolean, virtualRef?: (node: Element | null) => void, virtualIndex?: number) => {
    const rowKey = String(row[keyField]);
    const isSelected = selectedKeys.has(rowKey);
    const actualRowNumber = isVirtual
      ? rowIndex + 1
      : (currentPage - 1) * pageSize + rowIndex + 1;

    return (
      <tr
        key={rowKey}
        data-index={isVirtual ? virtualIndex : undefined}
        ref={isVirtual ? virtualRef : undefined}
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
        {isExcelMode && excelConfig?.showRowNumbers && (
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
          <td className={cn('w-12 px-4', isExcelMode ? 'py-1.5' : 'py-3')} onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelectRow(row)}
              aria-label="Chọn dòng"
              className="h-4 w-4"
            />
          </td>
        )}

        {/* Data cells */}
        {activeColumns.map((column) => {
          const value = getCellValue(row, column);
          const content = column.render
            ? column.render(value, row, rowIndex)
            : value as React.ReactNode;

          return (
            <td
              key={column.key}
              className={cn(
                'text-slate-700 dark:text-slate-300',
                isExcelMode
                  ? cn(
                      'px-2 text-[11px] font-mono',
                      excelConfig?.compactMode ? 'py-1' : 'py-1.5',
                      'border-r border-b border-slate-200 dark:border-slate-800 last:border-r-0'
                    )
                  : cn(
                      'px-4 text-sm',
                      compact ? 'py-2' : 'py-3',
                      bordered && 'border-b border-slate-100 dark:border-slate-800'
                    ),
                column.type === 'number' && 'font-mono tabular-nums',
                column.type === 'currency' && 'font-mono tabular-nums',
                column.cellClassName?.(value, row, rowIndex)
              )}
            >
              {content}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <>
      <tbody>
        {loading ? (
          <tr>
            <td colSpan={totalColSpan} className="px-4 py-12 text-center">
              <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{t('dataTable.loading')}</span>
              </div>
            </td>
          </tr>
        ) : (virtualize ? virtualData : paginatedData).length === 0 ? (
          <tr>
            <td colSpan={totalColSpan} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
              {emptyMessage}
            </td>
          </tr>
        ) : virtualize ? (
          <>
            {rowVirtualizer.getVirtualItems()[0]?.start > 0 && (
              <tr><td style={{ height: rowVirtualizer.getVirtualItems()[0].start }} /></tr>
            )}
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = virtualData[virtualRow.index];
              return renderRow(row, virtualRow.index, true, rowVirtualizer.measureElement, virtualRow.index);
            })}
            {(() => {
              const items = rowVirtualizer.getVirtualItems();
              const lastItem = items[items.length - 1];
              const paddingBottom = lastItem ? rowVirtualizer.getTotalSize() - lastItem.end : 0;
              return paddingBottom > 0 ? <tr><td style={{ height: paddingBottom }} /></tr> : null;
            })()}
          </>
        ) : (
          paginatedData.map((row, rowIndex) => renderRow(row, rowIndex, false))
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
            {isExcelMode && excelConfig?.showRowNumbers && <td className="px-1 py-2" />}
            {selectable && <td className="px-4 py-3" />}
            {activeColumns.map((column) => (
              <td
                key={column.key}
                className={cn(
                  'font-medium text-slate-700 dark:text-slate-300',
                  isExcelMode
                    ? 'px-2 py-1.5 text-[10px] text-[#217346] dark:text-[#70AD47]'
                    : 'px-4 py-3 text-sm'
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
    </>
  );
}
