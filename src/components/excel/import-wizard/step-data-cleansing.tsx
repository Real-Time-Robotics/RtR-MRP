"use client";

// src/components/excel/import-wizard/step-data-cleansing.tsx
// Step 5 (after Validation): Data Cleansing - Edit data before import

import { useState, useCallback, useMemo } from "react";
import {
  Eraser,
  Wand2,
  Trash2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { CellEdit, ColumnMapping } from "./import-wizard-types";
import type { DataIssue } from "@/lib/excel/ai-validator";

interface StepDataCleansingProps {
  data: Record<string, unknown>[];
  mappings: ColumnMapping[];
  dataIssues: DataIssue[];
  onDataChange: (updatedData: Record<string, unknown>[]) => void;
}

export function StepDataCleansing({
  data,
  mappings,
  dataIssues,
  onDataChange,
}: StepDataCleansingProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [edits, setEdits] = useState<CellEdit[]>([]);
  const [savedCell, setSavedCell] = useState<string | null>(null);

  // Get mapped column names
  const columns = useMemo(() => {
    const sourceColumns = mappings.map((m) => m.sourceColumn);
    if (sourceColumns.length === 0 && data.length > 0) {
      return Object.keys(data[0]);
    }
    return sourceColumns;
  }, [mappings, data]);

  // Build issue map: row -> column -> issue
  const issueMap = useMemo(() => {
    const map = new Map<string, DataIssue>();
    dataIssues.forEach((issue) => {
      const key = `${issue.row}-${issue.column}`;
      map.set(key, issue);
    });
    return map;
  }, [dataIssues]);

  // Get cell issue
  const getCellIssue = (rowIndex: number, column: string): DataIssue | undefined => {
    return issueMap.get(`${rowIndex + 1}-${column}`) || issueMap.get(`${rowIndex + 2}-${column}`);
  };

  // Start editing a cell
  const handleCellClick = (rowIndex: number, column: string) => {
    setEditingCell({ row: rowIndex, col: column });
    setEditValue(String(data[rowIndex][column] ?? ""));
  };

  // Save cell edit
  const handleCellSave = () => {
    if (!editingCell) return;

    const { row, col } = editingCell;
    const oldValue = data[row][col];

    if (String(oldValue ?? "") !== editValue) {
      const newData = [...data];
      newData[row] = { ...newData[row], [col]: editValue };
      onDataChange(newData);

      setEdits((prev) => [...prev, {
        rowIndex: row,
        columnKey: col,
        oldValue,
        newValue: editValue,
      }]);

      // Show brief saved indicator
      const cellKey = `${row}-${col}`;
      setSavedCell(cellKey);
      setTimeout(() => setSavedCell((prev) => prev === cellKey ? null : prev), 1500);
    }

    setEditingCell(null);
  };

  // Apply AI suggested fix for a single issue
  const handleApplyFix = useCallback((issue: DataIssue) => {
    if (!issue.suggestion) return;

    const rowIndex = issue.row - 2; // Convert from 1-indexed (with header) to 0-indexed
    if (rowIndex < 0 || rowIndex >= data.length) return;

    const newData = [...data];
    newData[rowIndex] = { ...newData[rowIndex], [issue.column]: issue.suggestion };
    onDataChange(newData);

    setEdits((prev) => [...prev, {
      rowIndex,
      columnKey: issue.column,
      oldValue: data[rowIndex][issue.column],
      newValue: issue.suggestion,
    }]);
  }, [data, onDataChange]);

  // Fix All - apply all AI suggestions
  const handleFixAll = useCallback(() => {
    const fixableIssues = dataIssues.filter((i) => i.suggestion);
    if (fixableIssues.length === 0) return;

    const newData = data.map((row) => ({ ...row }));
    const newEdits: CellEdit[] = [];

    fixableIssues.forEach((issue) => {
      const rowIndex = issue.row - 2;
      if (rowIndex < 0 || rowIndex >= newData.length) return;

      newEdits.push({
        rowIndex,
        columnKey: issue.column,
        oldValue: newData[rowIndex][issue.column],
        newValue: issue.suggestion,
      });

      newData[rowIndex][issue.column] = issue.suggestion;
    });

    onDataChange(newData);
    setEdits((prev) => [...prev, ...newEdits]);
  }, [data, dataIssues, onDataChange]);

  // Trim whitespace for all cells
  const handleTrimWhitespace = useCallback(() => {
    const newData = data.map((row) => {
      const newRow: Record<string, unknown> = {};
      Object.entries(row).forEach(([key, value]) => {
        newRow[key] = typeof value === "string" ? value.trim() : value;
      });
      return newRow;
    });
    onDataChange(newData);
  }, [data, onDataChange]);

  // Remove empty rows
  const handleRemoveEmptyRows = useCallback(() => {
    const newData = data.filter((row) =>
      Object.values(row).some((v) => v !== null && v !== "" && v !== undefined)
    );
    onDataChange(newData);
  }, [data, onDataChange]);

  // Count issues by severity
  const errorCount = dataIssues.filter((i) => i.severity === "error").length;
  const warningCount = dataIssues.filter((i) => i.severity === "warning").length;
  const fixableCount = dataIssues.filter((i) => i.suggestion).length;

  // Show max 100 rows for performance
  const displayData = data.slice(0, 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Chỉnh sửa dữ liệu</h3>
          <p className="text-gray-600">
            Sửa các lỗi được phát hiện trước khi import. Click vào ô để sửa.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{data.length} dòng</span>
          <span className="text-muted-foreground">·</span>
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <AlertCircle className="w-4 h-4" />
              {errorCount} lỗi
            </span>
          )}
          {warningCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
              {warningCount} cảnh báo
            </span>
          )}
          {edits.length > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle className="w-4 h-4" />
              {edits.length} đã sửa
            </span>
          )}
        </div>
      </div>

      {/* Bulk actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={handleTrimWhitespace}
        >
          <Eraser className="w-4 h-4 mr-1" />
          Trim khoảng trắng
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRemoveEmptyRows}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Xoá dòng trống
        </Button>
        {fixableCount > 0 && (
          <Button
            variant="default"
            size="sm"
            onClick={handleFixAll}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Wand2 className="w-4 h-4 mr-1" />
            Sửa tất cả ({fixableCount} gợi ý)
          </Button>
        )}
      </div>

      {/* Editable data table */}
      <div className="border rounded-lg overflow-auto max-h-[400px]">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-xs w-12">#</th>
              {columns.map((col) => (
                <th key={col} className="text-left px-3 py-2 font-medium text-xs min-w-[120px]">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {displayData.map((row, rowIndex) => (
              <tr key={rowIndex} className="group hover:bg-gray-50/50">
                <td className="px-3 py-1.5 text-xs text-muted-foreground font-mono">
                  {rowIndex + 1}
                </td>
                {columns.map((col) => {
                  const issue = getCellIssue(rowIndex, col);
                  const isEditing = editingCell?.row === rowIndex && editingCell?.col === col;
                  const isSaved = savedCell === `${rowIndex}-${col}`;
                  const value = row[col];

                  return (
                    <td
                      key={col}
                      className={cn(
                        "px-3 py-1.5 text-xs cursor-pointer border-l",
                        issue?.severity === "error" && "bg-red-50",
                        issue?.severity === "warning" && "bg-amber-50",
                        isEditing && "p-0"
                      )}
                      onClick={() => !isEditing && handleCellClick(rowIndex, col)}
                      title={issue ? `${issue.issue}\nGợi ý: ${issue.suggestion || "Không có"}` : undefined}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellSave}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleCellSave();
                            if (e.key === "Escape") setEditingCell(null);
                          }}
                          className="w-full px-3 py-1.5 text-xs border-2 border-blue-500 focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          {isSaved && (
                            <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0 animate-in fade-in" />
                          )}
                          <span className="truncate max-w-[200px]">
                            {value === null || value === undefined ? (
                              <span className="text-muted-foreground italic">trống</span>
                            ) : (
                              String(value)
                            )}
                          </span>
                          {issue && (
                            <button
                              className="flex-shrink-0 opacity-0 group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (issue.suggestion) handleApplyFix(issue);
                              }}
                              title={issue.suggestion ? `Áp dụng: ${issue.suggestion}` : issue.issue}
                            >
                              {issue.severity === "error" ? (
                                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length > 100 && (
        <p className="text-xs text-muted-foreground text-center">
          Hiển thị 100 / {data.length} dòng. Các dòng còn lại sẽ được import bình thường.
        </p>
      )}

      {/* Issue list with quick fix */}
      {dataIssues.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Các vấn đề cần xử lý</h4>
          <div className="max-h-[200px] overflow-auto space-y-1">
            {dataIssues.slice(0, 50).map((issue, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg text-xs",
                  issue.severity === "error" ? "bg-red-50" : "bg-amber-50"
                )}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {issue.severity === "error" ? (
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  )}
                  <span className="truncate">
                    Dòng {issue.row}, cột &quot;{issue.column}&quot;: {issue.issue}
                  </span>
                </div>
                {issue.suggestion && (
                  <button
                    onClick={() => handleApplyFix(issue)}
                    className="flex items-center gap-1 px-2 py-1 bg-white border rounded text-xs hover:bg-gray-50 flex-shrink-0 ml-2"
                  >
                    <Wand2 className="w-3 h-3" />
                    Sửa: {String(issue.suggestion).slice(0, 20)}
                  </button>
                )}
              </div>
            ))}
            {dataIssues.length > 50 && (
              <p className="text-xs text-muted-foreground text-center py-1">
                Và {dataIssues.length - 50} vấn đề khác...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
