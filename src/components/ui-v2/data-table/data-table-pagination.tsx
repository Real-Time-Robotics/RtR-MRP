'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  t,
}) => {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-b-xl">
      {/* Info */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {t('dataTable.showingRange', { start: String(startItem), end: String(endItem), total: formatNumber(totalItems) })}
        </span>

        {/* Page size select */}
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          aria-label={t('dataTable.perPage')}
          className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-md focus:ring-2 focus:ring-primary-500 dark:text-slate-200"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size} {t('dataTable.perPage')}
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

// Excel-style compact pagination
export interface ExcelPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

export const ExcelPagination: React.FC<ExcelPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  t,
}) => {
  return (
    <div className="flex items-center justify-center gap-2 px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className={cn(
          'p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700',
          currentPage <= 1 && 'opacity-50 cursor-not-allowed'
        )}
      >
        <ChevronLeft className="h-3 w-3 text-slate-500" />
      </button>
      <span className="text-[10px] text-slate-500 font-mono">
        {t('dataTable.page', { current: String(currentPage), total: String(totalPages) })}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={cn(
          'p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700',
          currentPage >= totalPages && 'opacity-50 cursor-not-allowed'
        )}
      >
        <ChevronRight className="h-3 w-3 text-slate-500" />
      </button>
    </div>
  );
};
