"use client";

// src/components/excel/import-wizard/step-validation.tsx
// Step 4: Validation & Review

import { CheckCircle, AlertCircle } from "lucide-react";
import { AISuggestionsPanel } from "../ai-suggestions-panel";
import type { ParseResult } from "./import-wizard-types";
import type { DataIssue } from "@/lib/excel/ai-validator";
import type { DuplicateMatch, AIDuplicateResolution } from "@/lib/excel/duplicate-detector";

interface StepValidationProps {
  parseResult: ParseResult | null;
  summary: { newRecords?: number; errors?: number } | null;
  dataIssues: DataIssue[];
  duplicates: DuplicateMatch[];
  duplicateResolutions: AIDuplicateResolution[];
  isValidating: boolean;
  isCheckingDuplicates: boolean;
  onAcceptDuplicateAction: (row: number, action: string) => void;
  onRefreshAI: () => void;
}

export function StepValidation({
  parseResult,
  summary,
  dataIssues,
  duplicates,
  duplicateResolutions,
  isValidating,
  isCheckingDuplicates,
  onAcceptDuplicateAction,
  onRefreshAI,
}: StepValidationProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Kiểm tra dữ liệu</h3>
      <p className="text-gray-600">
        Xem xét các vấn đề được phát hiện trước khi import.
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-2xl font-bold text-blue-700">
            {parseResult?.sheets[0]?.rowCount || 0}
          </p>
          <p className="text-sm text-blue-600">Tổng số dòng</p>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-2xl font-bold text-green-700">
            {summary?.newRecords || parseResult?.sheets[0]?.rowCount || 0}
          </p>
          <p className="text-sm text-green-600">Bản ghi mới</p>
        </div>
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-2xl font-bold text-orange-700">
            {duplicates.length}
          </p>
          <p className="text-sm text-orange-600">Trùng lặp</p>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-2xl font-bold text-red-700">
            {summary?.errors || 0}
          </p>
          <p className="text-sm text-red-600">Lỗi</p>
        </div>
      </div>

      {/* AI Suggestions Panel with Issues and Duplicates */}
      <AISuggestionsPanel
        dataIssues={dataIssues}
        duplicates={duplicates}
        duplicateResolutions={duplicateResolutions}
        onAcceptDuplicateAction={onAcceptDuplicateAction}
        isLoading={isValidating || isCheckingDuplicates}
        onRefresh={onRefreshAI}
        collapsible={false}
        defaultExpanded={true}
      />

      {/* Warning if there are errors */}
      {(summary?.errors || 0) > 0 && (
        <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Có {summary?.errors} lỗi cần xử lý</p>
            <p className="text-sm">
              Bạn vẫn có thể tiếp tục import, nhưng các dòng có lỗi sẽ bị bỏ qua.
            </p>
          </div>
        </div>
      )}

      {/* No issues message */}
      {dataIssues.length === 0 && duplicates.length === 0 && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Dữ liệu hợp lệ!</p>
            <p className="text-sm">
              Không phát hiện vấn đề nào. Bạn có thể tiếp tục import.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
