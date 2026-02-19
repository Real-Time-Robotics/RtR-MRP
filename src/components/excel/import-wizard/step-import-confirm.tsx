"use client";

// src/components/excel/import-wizard/step-import-confirm.tsx
// Step 5: Import Confirmation & Execution

import { Play, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENTITY_TYPES } from "./import-wizard-types";
import type { ParseResult, ColumnMapping, ImportResult } from "./import-wizard-types";

interface StepImportConfirmProps {
  parseResult: ParseResult | null;
  entityType: string;
  updateMode: "insert" | "update" | "upsert";
  mappings: ColumnMapping[];
  duplicatesCount: number;
  importResult: ImportResult | null;
  isLoading: boolean;
  onImport: () => void;
  onClose?: () => void;
}

export function StepImportConfirm({
  parseResult,
  entityType,
  updateMode,
  mappings,
  duplicatesCount,
  importResult,
  isLoading,
  onImport,
  onClose,
}: StepImportConfirmProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Import dữ liệu</h3>

      {!importResult && (
        <>
          <p className="text-gray-600">
            Sẵn sàng import {parseResult?.sheets[0]?.rowCount || 0} dòng dữ liệu.
          </p>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Tóm tắt Import</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li><span className="text-gray-500">File:</span> {parseResult?.fileName}</li>
              <li><span className="text-gray-500">Loại dữ liệu:</span> {ENTITY_TYPES.find((t) => t.value === entityType)?.label || entityType}</li>
              <li><span className="text-gray-500">Số dòng:</span> {parseResult?.sheets[0]?.rowCount || 0}</li>
              <li><span className="text-gray-500">Chế độ:</span> {updateMode === "insert" ? "Thêm mới" : updateMode === "update" ? "Cập nhật" : "Thêm/Cập nhật"}</li>
              <li><span className="text-gray-500">Số cột mapping:</span> {mappings.length}</li>
              {duplicatesCount > 0 && (
                <li><span className="text-gray-500">Bản ghi trùng:</span> {duplicatesCount} (sẽ xử lý theo cài đặt)</li>
              )}
            </ul>
          </div>

          <button
            onClick={onImport}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang import...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Bắt đầu Import
              </>
            )}
          </button>
        </>
      )}

      {importResult && (
        <div className="space-y-4">
          <div
            className={cn(
              "p-4 rounded-lg",
              importResult.errors.length === 0
                ? "bg-green-50 border border-green-200"
                : "bg-yellow-50 border border-yellow-200"
            )}
          >
            <h4 className="font-medium mb-2">
              {importResult.errors.length === 0
                ? "Import hoàn tất thành công!"
                : "Import hoàn tất với một số lỗi"}
            </h4>
            <ul className="text-sm space-y-1">
              <li>Đã xử lý: {importResult.processed} dòng</li>
              <li className="text-green-700">
                Thành công: {importResult.success} dòng
              </li>
              {importResult.errors.length > 0 && (
                <li className="text-red-700">
                  Lỗi: {importResult.errors.length} dòng
                </li>
              )}
            </ul>
          </div>

          {importResult.errors.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-red-50 px-4 py-2 border-b">
                <h5 className="font-medium text-red-700">Chi tiết lỗi</h5>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Dòng</th>
                      <th className="px-4 py-2 text-left">Lỗi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {importResult.errors.map((err, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2">{err.row}</td>
                        <td className="px-4 py-2 text-red-600">
                          {err.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Success Action Buttons */}
          {importResult.errors.length === 0 && onClose && (
            <div className="flex gap-3 mt-4">
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Check className="w-4 h-4" />
                Đóng
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
