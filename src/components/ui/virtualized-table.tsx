// src/components/ui/virtualized-table.tsx
// High-performance virtualized table for large datasets

"use client";

import React, { useRef, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2 } from "lucide-react";

// ============================================
// TYPES
// ============================================

export interface Column<T> {
  key: string;
  header: string;
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  align?: "left" | "center" | "right";
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  sortable?: boolean;
}

export interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  headerHeight?: number;
  maxHeight?: number | string;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T, index: number) => void;
  rowClassName?: (row: T, index: number) => string;
  stickyHeader?: boolean;
  overscan?: number;
}

// ============================================
// VIRTUALIZED TABLE COMPONENT
// ============================================

export function VirtualizedTable<T extends { id: string }>({
  data,
  columns,
  rowHeight = 48,
  headerHeight = 44,
  maxHeight = 600,
  loading = false,
  emptyMessage = "No data available",
  onRowClick,
  rowClassName,
  stickyHeader = true,
  overscan = 5,
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Row virtualizer
  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  // Get cell value from row
  const getCellValue = useCallback((row: T, key: string): unknown => {
    const keys = key.split(".");
    let value: unknown = row;
    for (const k of keys) {
      if (value && typeof value === "object") {
        value = (value as Record<string, unknown>)[k];
      } else {
        return undefined;
      }
    }
    return value;
  }, []);

  // Render cell content
  const renderCell = useCallback(
    (column: Column<T>, row: T, index: number): React.ReactNode => {
      const value = getCellValue(row, column.key);

      if (column.render) {
        return column.render(value, row, index);
      }

      if (value === null || value === undefined) {
        return <span className="text-muted-foreground">-</span>;
      }

      return String(value);
    },
    [getCellValue]
  );

  // Calculate column widths
  const columnWidths = useMemo(() => {
    return columns.map((col) => {
      if (col.width) return col.width;
      return "auto";
    });
  }, [columns]);

  // Grid template columns
  const gridTemplateColumns = useMemo(() => {
    return columnWidths
      .map((w) => (typeof w === "number" ? `${w}px` : w))
      .join(" ");
  }, [columnWidths]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full border rounded-lg overflow-hidden">
      {/* Header */}
      {stickyHeader && (
        <div
          className="grid bg-muted/50 border-b font-medium text-sm"
          style={{
            gridTemplateColumns,
            height: headerHeight,
          }}
        >
          {columns.map((column) => (
            <div
              key={column.key}
              className={`flex items-center px-4 ${
                column.align === "center"
                  ? "justify-center"
                  : column.align === "right"
                  ? "justify-end"
                  : "justify-start"
              }`}
              style={{
                minWidth: column.minWidth,
                maxWidth: column.maxWidth,
              }}
            >
              {column.header}
            </div>
          ))}
        </div>
      )}

      {/* Virtualized Body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{
          maxHeight:
            typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight,
        }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = data[virtualRow.index];
            const customClassName = rowClassName
              ? rowClassName(row, virtualRow.index)
              : "";

            return (
              <div
                key={row.id}
                className={`grid absolute left-0 w-full border-b hover:bg-muted/50 transition-colors ${
                  onRowClick ? "cursor-pointer" : ""
                } ${customClassName}`}
                style={{
                  gridTemplateColumns,
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onRowClick?.(row, virtualRow.index)}
              >
                {columns.map((column) => (
                  <div
                    key={column.key}
                    className={`flex items-center px-4 overflow-hidden ${
                      column.align === "center"
                        ? "justify-center"
                        : column.align === "right"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                    style={{
                      minWidth: column.minWidth,
                      maxWidth: column.maxWidth,
                    }}
                  >
                    <div className="truncate">
                      {renderCell(column, row, virtualRow.index)}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default VirtualizedTable;
