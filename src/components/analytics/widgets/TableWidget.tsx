"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WidgetContainer } from "./WidgetContainer";
import { cn } from "@/lib/utils";

export interface TableColumn {
  key: string;
  label: string;
  width?: number;
  align?: "left" | "center" | "right";
  formatter?: (value: unknown) => string;
}

/** A row in the table widget - keys map to column keys, values are cell values */
export type TableRow = Record<string, unknown>;

export interface TableWidgetProps {
  id: string;
  title: string;
  titleVi?: string;
  columns?: TableColumn[];
  initialData?: { columns: TableColumn[]; rows: TableRow[] } | null;
  pageSize?: number;
  refreshInterval?: number;
  onRowClick?: (row: TableRow) => void;
  className?: string;
}

export function TableWidget({
  id,
  title,
  titleVi,
  columns: propColumns,
  initialData,
  pageSize = 10,
  refreshInterval,
  onRowClick,
  className,
}: TableWidgetProps) {
  const [data, setData] = useState<{ columns: TableColumn[]; rows: TableRow[] } | null>(
    initialData || null
  );
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const columns = propColumns || data?.columns || [];
  const rows = data?.rows || [];
  const totalPages = Math.ceil(rows.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleRows = rows.slice(startIndex, startIndex + pageSize);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/analytics/widgets/${id}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data.data);
        setError(null);
      } else {
        setError(result.error || "Failed to fetch table data");
      }
    } catch (err) {
      setError("Failed to fetch table data");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!initialData) {
      fetchData();
    }
  }, [fetchData, initialData]);

  const handleRefresh = async () => {
    setIsLoading(true);
    setCurrentPage(1);
    await fetchData();
  };

  const handlePrevPage = () => {
    setCurrentPage((p) => Math.max(1, p - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  };

  const getCellAlignment = (align?: string) => {
    switch (align) {
      case "center":
        return "text-center";
      case "right":
        return "text-right";
      default:
        return "text-left";
    }
  };

  const formatCellValue = (column: TableColumn, value: unknown) => {
    if (column.formatter) {
      return column.formatter(value);
    }
    if (value === null || value === undefined) {
      return "—";
    }
    return String(value);
  };

  return (
    <WidgetContainer
      id={id}
      title={title}
      titleVi={titleVi}
      isLoading={isLoading}
      error={error}
      refreshInterval={refreshInterval}
      onRefresh={handleRefresh}
      className={className}
    >
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(
                      getCellAlignment(column.align),
                      "whitespace-nowrap"
                    )}
                    style={{ width: column.width ? `${column.width}px` : undefined }}
                  >
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center text-muted-foreground py-8"
                  >
                    Không có dữ liệu
                  </TableCell>
                </TableRow>
              ) : (
                visibleRows.map((row, rowIndex) => (
                  <TableRow
                    key={rowIndex}
                    onClick={() => onRowClick?.(row)}
                    className={cn(onRowClick && "cursor-pointer hover:bg-muted/50")}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn(
                          getCellAlignment(column.align),
                          "whitespace-nowrap"
                        )}
                      >
                        {formatCellValue(column, row[column.key])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              Trang {currentPage} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </WidgetContainer>
  );
}

export default TableWidget;
