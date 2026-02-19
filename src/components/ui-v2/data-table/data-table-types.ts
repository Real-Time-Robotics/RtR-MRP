import React from 'react';
import type { ExcelModeConfig } from '../excel';

// Re-export ExcelModeConfig for convenience
export type { ExcelModeConfig };

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Cell value type varies by column key at runtime
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
  accessor?: (row: T) => unknown;
  /** Footer content */
  footer?: string | ((rows: T[]) => React.ReactNode);
  /** Dynamic className applied to the td element (for cell-level coloring) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Cell value type varies by column key at runtime
  cellClassName?: (value: any, row: T, index: number) => string;
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
  /** Enable row virtualization for large datasets */
  virtualize?: boolean;
  /** Row height in pixels when virtualized (default 40) */
  virtualRowHeight?: number;
}
