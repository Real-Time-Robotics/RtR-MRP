"use client";

// src/components/excel/import-wizard/step-column-mapping.tsx
// Step 3: Column Mapping

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ColumnMapper } from "../column-mapper";
import { AISuggestionsPanel } from "../ai-suggestions-panel";
import type { ColumnMapping, FieldDefinition, ParseResult } from "./import-wizard-types";
import type { AIColumnSuggestion } from "@/lib/excel/ai-mapper";

interface StepColumnMappingProps {
  parseResult: ParseResult;
  targetFields: FieldDefinition[];
  mappings: ColumnMapping[];
  updateMode: "insert" | "update" | "upsert";
  showAIPanel: boolean;
  columnSuggestions: AIColumnSuggestion[];
  isMappingColumns: boolean;
  onMappingChange: (mappings: ColumnMapping[]) => void;
  onUpdateModeChange: (mode: "insert" | "update" | "upsert") => void;
  onToggleAIPanel: () => void;
  onAcceptColumnSuggestion: (suggestion: AIColumnSuggestion) => void;
  onRefreshAI: () => void;
}

export function StepColumnMapping({
  parseResult,
  targetFields,
  mappings,
  updateMode,
  showAIPanel,
  columnSuggestions,
  isMappingColumns,
  onMappingChange,
  onUpdateModeChange,
  onToggleAIPanel,
  onAcceptColumnSuggestion,
  onRefreshAI,
}: StepColumnMappingProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Mapping cột dữ liệu</h3>
          <p className="text-gray-600">
            Ghép nối các cột trong file với trường dữ liệu hệ thống.
          </p>
        </div>
        <button
          onClick={onToggleAIPanel}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
            showAIPanel
              ? "bg-purple-100 text-purple-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          <Sparkles className="w-4 h-4" />
          {showAIPanel ? "Ẩn AI" : "Hiện AI"}
        </button>
      </div>

      {/* AI Suggestions Panel for Column Mapping */}
      {showAIPanel && (
        <AISuggestionsPanel
          columnSuggestions={columnSuggestions}
          onAcceptColumnSuggestion={onAcceptColumnSuggestion}
          isLoading={isMappingColumns}
          onRefresh={onRefreshAI}
          collapsible={true}
          defaultExpanded={columnSuggestions.length > 0}
        />
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Chế độ cập nhật
        </label>
        <select
          value={updateMode}
          onChange={(e) =>
            onUpdateModeChange(e.target.value as "insert" | "update" | "upsert")
          }
          aria-label="Chế độ cập nhật"
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="insert">Chỉ thêm bản ghi mới</option>
          <option value="update">Chỉ cập nhật bản ghi đã có</option>
          <option value="upsert">Thêm mới hoặc cập nhật (upsert)</option>
        </select>
      </div>

      <ColumnMapper
        sourceColumns={parseResult.sheets[0]?.headers || []}
        targetFields={targetFields}
        initialMappings={mappings}
        onMappingChange={onMappingChange}
        sampleData={parseResult.preview}
      />
    </div>
  );
}
