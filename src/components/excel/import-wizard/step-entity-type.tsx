"use client";

// src/components/excel/import-wizard/step-entity-type.tsx
// Step 2: Select Entity Type

import { Sparkles, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENTITY_TYPES } from "./import-wizard-types";

interface EntitySuggestion {
  entityType: string;
  confidence?: number;
  reasoning?: string;
}

interface StepEntityTypeProps {
  entityType: string;
  isLoading: boolean;
  entitySuggestion: EntitySuggestion | null;
  isDetectingEntity: boolean;
  onEntityTypeSelect: (type: string) => void;
}

export function StepEntityType({
  entityType,
  isLoading,
  entitySuggestion,
  isDetectingEntity,
  onEntityTypeSelect,
}: StepEntityTypeProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Chọn loại dữ liệu</h3>
      <p className="text-gray-600">
        Chọn loại dữ liệu bạn muốn import.
      </p>

      {/* AI Entity Suggestion */}
      {entitySuggestion && (
        <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-purple-900">AI Đề xuất</span>
            {isDetectingEntity && (
              <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
            )}
          </div>
          <p className="text-sm text-purple-800 mb-2">
            Dựa trên phân tích headers và dữ liệu mẫu, AI nhận diện đây là dữ liệu{" "}
            <span className="font-semibold">
              {ENTITY_TYPES.find((t) => t.value === entitySuggestion.entityType)?.label ||
                entitySuggestion.entityType}
            </span>{" "}
            với độ tin cậy{" "}
            <span className="font-semibold">
              {Math.round((entitySuggestion.confidence || 0) * 100)}%
            </span>
          </p>
          {entitySuggestion.reasoning && (
            <p className="text-xs text-purple-600">
              💡 {entitySuggestion.reasoning}
            </p>
          )}
          <button
            onClick={() => onEntityTypeSelect(entitySuggestion.entityType)}
            className="mt-3 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
          >
            <Check className="w-4 h-4" />
            Sử dụng đề xuất này
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {ENTITY_TYPES.map((type) => {
          const isAISuggested = entitySuggestion?.entityType === type.value;
          return (
            <button
              key={type.value}
              onClick={() => onEntityTypeSelect(type.value)}
              disabled={isLoading}
              className={cn(
                "p-4 border rounded-lg text-left transition-colors hover:border-blue-500 relative",
                entityType === type.value
                  ? "border-blue-500 bg-blue-50"
                  : isAISuggested
                  ? "border-purple-300 bg-purple-50/50"
                  : "border-gray-200"
              )}
            >
              {isAISuggested && (
                <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">
                  AI
                </span>
              )}
              <p className="font-medium">{type.label}</p>
              <p className="text-sm text-gray-500">{type.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
