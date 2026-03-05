"use client";

// src/components/excel/import-wizard/step-column-mapping.tsx
// Step 3: Column Mapping with Save/Load Template support

import { useState, useEffect } from "react";
import { Sparkles, Save, FolderOpen, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ColumnMapper } from "../column-mapper";
import { AISuggestionsPanel } from "../ai-suggestions-panel";
import type { ColumnMapping, FieldDefinition, ParseResult } from "./import-wizard-types";
import type { AIColumnSuggestion } from "@/lib/excel/ai-mapper";
import { toast } from "sonner";

interface SavedMapping {
  id: string;
  name: string;
  targetType: string;
  mapping: Record<string, string>;
  usageCount: number;
  lastUsedAt: string | null;
}

interface StepColumnMappingProps {
  parseResult: ParseResult;
  targetFields: FieldDefinition[];
  mappings: ColumnMapping[];
  updateMode: "insert" | "update" | "upsert";
  showAIPanel: boolean;
  columnSuggestions: AIColumnSuggestion[];
  isMappingColumns: boolean;
  entityType: string;
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
  entityType,
  onMappingChange,
  onUpdateModeChange,
  onToggleAIPanel,
  onAcceptColumnSuggestion,
  onRefreshAI,
}: StepColumnMappingProps) {
  // Template state
  const [savedMappings, setSavedMappings] = useState<SavedMapping[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showLoadDropdown, setShowLoadDropdown] = useState(false);

  // Load saved templates on mount
  useEffect(() => {
    if (!entityType) return;

    const fetchTemplates = async () => {
      setIsLoadingTemplates(true);
      try {
        const res = await fetch(`/api/import/mappings?targetType=${entityType}`);
        const data = await res.json();
        if (data.success) {
          setSavedMappings(data.data);
        }
      } catch {
        // Silently fail - templates are optional
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, [entityType]);

  // Save current mapping as template
  const handleSaveTemplate = async () => {
    if (!templateName.trim() || mappings.length === 0) return;

    setIsSaving(true);
    try {
      const mappingRecord: Record<string, string> = {};
      mappings.forEach((m) => {
        if (m.targetField) {
          mappingRecord[m.sourceColumn] = m.targetField;
        }
      });

      const res = await fetch("/api/import/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName.trim(),
          targetType: entityType,
          mapping: mappingRecord,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Đã lưu template "${templateName.trim()}"`);
        setSavedMappings((prev) => [data.data, ...prev]);
        setShowSaveDialog(false);
        setTemplateName("");
      } else {
        toast.error(data.error || "Lưu template thất bại");
      }
    } catch {
      toast.error("Lưu template thất bại");
    } finally {
      setIsSaving(false);
    }
  };

  // Load a template
  const handleLoadTemplate = async (template: SavedMapping) => {
    // Convert mapping record to ColumnMapping array
    const newMappings: ColumnMapping[] = Object.entries(template.mapping).map(
      ([sourceColumn, targetField]) => ({
        sourceColumn,
        targetField,
      })
    );

    onMappingChange(newMappings);
    setShowLoadDropdown(false);

    // Update usage count
    try {
      await fetch("/api/import/mappings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappingId: template.id }),
      });
    } catch {
      // Non-critical - don't show error
    }

    toast.success(`Đã áp dụng template "${template.name}"`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Mapping cột dữ liệu</h3>
          <p className="text-gray-600">
            Ghép nối các cột trong file với trường dữ liệu hệ thống.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Load Template */}
          <div className="relative">
            <button
              onClick={() => setShowLoadDropdown(!showLoadDropdown)}
              disabled={isLoadingTemplates || savedMappings.length === 0}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                "bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
              )}
            >
              <FolderOpen className="w-4 h-4" />
              Tải template
              {savedMappings.length > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
                  {savedMappings.length}
                </span>
              )}
            </button>

            {showLoadDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowLoadDropdown(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white border rounded-lg shadow-lg py-1 min-w-[250px] max-h-[300px] overflow-auto">
                  {savedMappings.map((template) => (
                    <button
                      key={template.id}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-gray-50 text-left"
                      onClick={() => handleLoadTemplate(template)}
                    >
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {Object.keys(template.mapping).length} cột · {template.usageCount} lượt dùng
                        </div>
                      </div>
                      <Check className="w-4 h-4 text-green-600 opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Save Template */}
          <button
            onClick={() => setShowSaveDialog(true)}
            disabled={mappings.length === 0}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
              "bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
            )}
          >
            <Save className="w-4 h-4" />
            Lưu template
          </button>

          {/* AI Toggle */}
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
      </div>

      {/* Save Template Dialog */}
      {showSaveDialog && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowSaveDialog(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4">Lưu Mapping Template</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên template
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="VD: Mapping linh kiện công ty ABC"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && templateName.trim()) {
                        handleSaveTemplate();
                      }
                    }}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Template sẽ lưu {mappings.filter(m => m.targetField).length} mapping cột cho loại &quot;{entityType}&quot;.
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowSaveDialog(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={handleSaveTemplate}
                    disabled={!templateName.trim() || isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Lưu
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

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
        <p className="mt-1 text-xs text-muted-foreground">
          {updateMode === "insert" && "Bỏ qua nếu bản ghi đã tồn tại trong hệ thống."}
          {updateMode === "update" && "Chỉ cập nhật bản ghi khớp mã. Bỏ qua bản ghi mới."}
          {updateMode === "upsert" && "Cập nhật nếu đã có, thêm mới nếu chưa tồn tại."}
        </p>
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
