"use client";

// src/components/excel/ai-suggestions-panel.tsx
// AI Suggestions Panel for Excel Import

import { useState } from "react";
import {
  Sparkles,
  Check,
  X,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Copy,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface AIColumnSuggestion {
  sourceColumn: string;
  suggestedField: string | null;
  confidence: number;
  reasoning: string;
  alternatives?: { field: string; confidence: number }[];
}

interface DataIssue {
  row: number;
  column: string;
  value: unknown;
  issue: string;
  suggestion: string;
  severity: "error" | "warning" | "info";
  category?: string; // Optional for backward compatibility
}

interface DuplicateMatch {
  importRow: number;
  importValue: string;
  existingRecord: {
    id: string;
    identifier: string;
    name?: string;
  };
  matchType: "exact" | "similar" | "potential";
  similarity?: number;
}

interface AIDuplicateResolution {
  importRow: number;
  suggestedAction: "skip" | "update" | "create_new" | "merge";
  reasoning: string;
  confidence: number;
}

interface AISuggestionsPanelProps {
  // Column suggestions
  columnSuggestions?: AIColumnSuggestion[];
  onAcceptColumnSuggestion?: (suggestion: AIColumnSuggestion) => void;
  onRejectColumnSuggestion?: (suggestion: AIColumnSuggestion) => void;

  // Data issues
  dataIssues?: DataIssue[];
  onIgnoreIssue?: (issue: DataIssue) => void;

  // Duplicates
  duplicates?: DuplicateMatch[];
  duplicateResolutions?: AIDuplicateResolution[];
  onAcceptDuplicateAction?: (row: number, action: string) => void;

  // State
  isLoading?: boolean;
  onRefresh?: () => void;

  // Display options
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AISuggestionsPanel({
  columnSuggestions = [],
  onAcceptColumnSuggestion,
  onRejectColumnSuggestion,
  dataIssues = [],
  onIgnoreIssue,
  duplicates = [],
  duplicateResolutions = [],
  onAcceptDuplicateAction,
  isLoading = false,
  onRefresh,
  className,
  collapsible = true,
  defaultExpanded = true,
}: AISuggestionsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState<"mappings" | "issues" | "duplicates">("mappings");
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set());
  const [ignoredIssues, setIgnoredIssues] = useState<Set<string>>(new Set());

  // Summary counts
  const mappingSuggestionsCount = columnSuggestions.filter(
    (s) => s.suggestedField && s.confidence >= 0.5
  ).length;
  const errorCount = dataIssues.filter((i) => i.severity === "error").length;
  const warningCount = dataIssues.filter((i) => i.severity === "warning").length;
  const duplicatesCount = duplicates.length;

  const hasSuggestions =
    mappingSuggestionsCount > 0 || dataIssues.length > 0 || duplicatesCount > 0;

  if (!hasSuggestions && !isLoading) {
    return null;
  }

  const handleAcceptColumnSuggestion = (suggestion: AIColumnSuggestion) => {
    setAcceptedSuggestions((prev) => new Set([...prev, suggestion.sourceColumn]));
    onAcceptColumnSuggestion?.(suggestion);
  };

  const handleRejectColumnSuggestion = (suggestion: AIColumnSuggestion) => {
    onRejectColumnSuggestion?.(suggestion);
  };

  const handleIgnoreIssue = (issue: DataIssue) => {
    const key = `${issue.row}-${issue.column}`;
    setIgnoredIssues((prev) => new Set([...prev, key]));
    onIgnoreIssue?.(issue);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600 bg-green-100";
    if (confidence >= 0.6) return "text-yellow-600 bg-yellow-100";
    return "text-orange-600 bg-orange-100";
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div
      className={cn(
        "border rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 bg-white/80 border-b",
          collapsible && "cursor-pointer hover:bg-white/90"
        )}
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <span className="font-medium text-gray-900">AI Import Assistant</span>
          {isLoading && (
            <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Summary badges */}
          <div className="flex items-center gap-2 text-xs">
            {mappingSuggestionsCount > 0 && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                {mappingSuggestionsCount} gợi ý mapping
              </span>
            )}
            {errorCount > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                {errorCount} lỗi
              </span>
            )}
            {warningCount > 0 && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                {warningCount} cảnh báo
              </span>
            )}
            {duplicatesCount > 0 && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                {duplicatesCount} trùng lặp
              </span>
            )}
          </div>

          {onRefresh && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
              className="p-1 hover:bg-gray-100 rounded"
              disabled={isLoading}
            >
              <RefreshCw
                className={cn("w-4 h-4 text-gray-500", isLoading && "animate-spin")}
              />
            </button>
          )}

          {collapsible && (
            isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-white/50 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("mappings")}
              className={cn(
                "flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeTab === "mappings"
                  ? "bg-white text-purple-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              Gợi ý Mapping ({mappingSuggestionsCount})
            </button>
            <button
              onClick={() => setActiveTab("issues")}
              className={cn(
                "flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeTab === "issues"
                  ? "bg-white text-purple-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              Vấn đề ({dataIssues.length})
            </button>
            <button
              onClick={() => setActiveTab("duplicates")}
              className={cn(
                "flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeTab === "duplicates"
                  ? "bg-white text-purple-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              Trùng lặp ({duplicatesCount})
            </button>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-sm">
            {/* Mapping Suggestions */}
            {activeTab === "mappings" && (
              <div className="divide-y">
                {columnSuggestions.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Không có gợi ý mapping nào
                  </div>
                ) : (
                  columnSuggestions
                    .filter((s) => s.suggestedField && s.confidence >= 0.5)
                    .map((suggestion) => {
                      const isAccepted = acceptedSuggestions.has(suggestion.sourceColumn);

                      return (
                        <div
                          key={suggestion.sourceColumn}
                          className={cn(
                            "p-3 transition-colors",
                            isAccepted && "bg-green-50"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <code className="text-sm font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                  {suggestion.sourceColumn}
                                </code>
                                <span className="text-gray-400">→</span>
                                <code className="text-sm font-mono bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                                  {suggestion.suggestedField}
                                </code>
                                <span
                                  className={cn(
                                    "text-xs px-1.5 py-0.5 rounded",
                                    getConfidenceColor(suggestion.confidence)
                                  )}
                                >
                                  {Math.round(suggestion.confidence * 100)}%
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {suggestion.reasoning}
                              </p>
                            </div>

                            {!isAccepted ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleAcceptColumnSuggestion(suggestion)}
                                  className="p-1.5 text-green-600 hover:bg-green-100 rounded"
                                  title="Áp dụng gợi ý"
                                  aria-label="Áp dụng gợi ý"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRejectColumnSuggestion(suggestion)}
                                  className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                                  title="Bỏ qua"
                                  aria-label="Bỏ qua"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <Check className="w-4 h-4" /> Đã áp dụng
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            )}

            {/* Data Issues */}
            {activeTab === "issues" && (
              <div className="divide-y max-h-64 overflow-auto">
                {dataIssues.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Không phát hiện vấn đề dữ liệu
                  </div>
                ) : (
                  dataIssues
                    .filter((issue) => !ignoredIssues.has(`${issue.row}-${issue.column}`))
                    .slice(0, 50) // Limit display
                    .map((issue, index) => (
                      <div key={index} className="p-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-2">
                            {getSeverityIcon(issue.severity)}
                            <div>
                              <div className="text-sm">
                                <span className="font-medium">
                                  Dòng {issue.row}, Cột &quot;{issue.column}&quot;
                                </span>
                                {issue.value !== null && (
                                  <code className="ml-2 text-xs bg-gray-100 px-1 py-0.5 rounded">
                                    {String(issue.value).substring(0, 30)}
                                  </code>
                                )}
                              </div>
                              <p className="text-xs text-gray-700 mt-0.5">
                                {issue.issue}
                              </p>
                              <p className="text-xs text-blue-600 mt-0.5">
                                💡 {issue.suggestion}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleIgnoreIssue(issue)}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                            title="Bỏ qua"
                            aria-label="Bỏ qua"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                )}
                {dataIssues.length > 50 && (
                  <div className="p-3 text-center text-sm text-gray-500">
                    Và {dataIssues.length - 50} vấn đề khác...
                  </div>
                )}
              </div>
            )}

            {/* Duplicates */}
            {activeTab === "duplicates" && (
              <div className="divide-y max-h-64 overflow-auto">
                {duplicates.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Không tìm thấy bản ghi trùng lặp
                  </div>
                ) : (
                  duplicates.slice(0, 20).map((dup, index) => {
                    const resolution = duplicateResolutions.find(
                      (r) => r.importRow === dup.importRow
                    );

                    return (
                      <div key={index} className="p-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm">
                              <span className="font-medium">Dòng {dup.importRow}:</span>{" "}
                              <code className="bg-orange-100 text-orange-700 px-1 py-0.5 rounded">
                                {dup.importValue}
                              </code>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              {dup.matchType === "exact" ? "Trùng chính xác" : dup.matchType === "similar" ? "Tương tự" : "Có thể trùng"} với:{" "}
                              <span className="font-medium">{dup.existingRecord.identifier}</span>
                              {dup.existingRecord.name && ` (${dup.existingRecord.name})`}
                            </p>
                            {resolution && (
                              <p className="text-xs text-purple-600 mt-1">
                                💡 Đề xuất: {getActionLabel(resolution.suggestedAction)} ({Math.round(resolution.confidence * 100)}%)
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <select
                              className="text-xs border rounded px-2 py-1"
                              defaultValue={resolution?.suggestedAction || "skip"}
                              aria-label="Hành động trùng lặp"
                              onChange={(e) =>
                                onAcceptDuplicateAction?.(dup.importRow, e.target.value)
                              }
                            >
                              <option value="skip">Bỏ qua</option>
                              <option value="update">Cập nhật</option>
                              <option value="create_new">Tạo mới</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                {duplicates.length > 20 && (
                  <div className="p-3 text-center text-sm text-gray-500">
                    Và {duplicates.length - 20} bản ghi trùng khác...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Apply All Button */}
          {activeTab === "mappings" && mappingSuggestionsCount > 0 && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  columnSuggestions
                    .filter((s) => s.suggestedField && s.confidence >= 0.7)
                    .forEach(handleAcceptColumnSuggestion);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                <Sparkles className="w-4 h-4" />
                Áp dụng tất cả gợi ý tin cậy cao
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function for action labels
function getActionLabel(action: string): string {
  switch (action) {
    case "skip":
      return "Bỏ qua";
    case "update":
      return "Cập nhật bản ghi hiện có";
    case "create_new":
      return "Tạo bản ghi mới";
    case "merge":
      return "Hợp nhất dữ liệu";
    default:
      return action;
  }
}

export default AISuggestionsPanel;
