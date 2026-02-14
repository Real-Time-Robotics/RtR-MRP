"use client";

// src/components/excel/import-wizard.tsx
// Multi-Step Import Wizard Component with AI Integration

import { useState, useCallback } from "react";
import {
  Upload,
  Columns,
  CheckCircle,
  Play,
  FileCheck,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  Check,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FileUpload } from "./file-upload";
import { ColumnMapper } from "./column-mapper";
import { AISuggestionsPanel } from "./ai-suggestions-panel";
import { useAIImport } from "@/hooks/use-ai-import";

interface ImportStep {
  id: number;
  name: string;
  icon: React.ElementType;
}

const STEPS: ImportStep[] = [
  { id: 1, name: "Tải file", icon: Upload },
  { id: 2, name: "Chọn loại", icon: FileCheck },
  { id: 3, name: "Mapping cột", icon: Columns },
  { id: 4, name: "Kiểm tra", icon: CheckCircle },
  { id: 5, name: "Import", icon: Play },
];

const ENTITY_TYPES = [
  { value: "parts", label: "Linh kiện", description: "Import dữ liệu linh kiện / vật tư" },
  { value: "suppliers", label: "Nhà cung cấp", description: "Import thông tin nhà cung cấp" },
  { value: "products", label: "Sản phẩm", description: "Import danh mục sản phẩm" },
  { value: "customers", label: "Khách hàng", description: "Import dữ liệu khách hàng" },
  { value: "inventory", label: "Tồn kho", description: "Import số liệu tồn kho" },
  { value: "bom", label: "BOM", description: "Import định mức vật tư (BOM)" },
];

interface FieldDefinition {
  key: string;
  label: string;
  type: string;
  required: boolean;
}

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
}

interface ParseResult {
  jobId: string;
  fileName: string;
  fileSize: number;
  sheets: {
    name: string;
    rowCount: number;
    headers: string[];
  }[];
  preview: Record<string, unknown>[];
  mappings?: ColumnMapping[];
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  severity: "error" | "warning";
}

interface ImportWizardProps {
  onSuccess?: () => void;
  onClose?: () => void;
  defaultEntityType?: string;
}

export function ImportWizard({ onSuccess, onClose, defaultEntityType }: ImportWizardProps = {}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [entityType, setEntityType] = useState<string>(defaultEntityType || "");
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [updateMode, setUpdateMode] = useState<"insert" | "update" | "upsert">("insert");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importResult, setImportResult] = useState<{
    processed: number;
    success: number;
    errors: { row: number; message: string }[];
  } | null>(null);

  const [targetFields, setTargetFields] = useState<FieldDefinition[]>([]);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [duplicateActions, setDuplicateActions] = useState<Record<number, string>>({});

  // AI Import Hook
  const aiImport = useAIImport();

  // Handle file selection and upload
  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setError(null);
    setIsLoading(true);
    aiImport.reset();

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/excel/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const result = await response.json();
      setParseResult(result);
      setCurrentStep(2);

      // Trigger AI entity detection
      if (result.sheets?.[0]?.headers && result.preview) {
        aiImport.analyzeFile(result.sheets[0].headers, result.preview);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsLoading(false);
    }
  }, [aiImport]);

  // Handle entity type selection
  const handleEntityTypeSelect = useCallback(async (type: string) => {
    setEntityType(type);
    setIsLoading(true);
    setError(null);

    try {
      // Fetch field definitions
      const response = await fetch(`/api/excel/templates?type=${type}`);
      if (!response.ok) throw new Error("Failed to fetch field definitions");

      const data = await response.json();
      setTargetFields(data.fields);

      // Re-upload with entity type to get auto-mappings
      if (selectedFile && parseResult) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("entityType", type);

        const uploadResponse = await fetch("/api/excel/import", {
          method: "POST",
          body: formData,
        });

        if (uploadResponse.ok) {
          const result = await uploadResponse.json();
          setParseResult(result);
          if (result.mappings) {
            setMappings(result.mappings);
          }

          // Trigger AI column mapping for unmapped columns
          const headers = result.sheets?.[0]?.headers || [];
          const mappedColumns = result.mappings?.map((m: ColumnMapping) => m.sourceColumn) || [];
          const unmappedColumns = headers.filter((h: string) => !mappedColumns.includes(h));

          if (unmappedColumns.length > 0 && result.preview) {
            aiImport.suggestMappings(unmappedColumns, type, result.preview);
          }
        }
      }

      setCurrentStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load fields");
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, parseResult, aiImport]);

  // Handle mapping change
  const handleMappingChange = useCallback((newMappings: ColumnMapping[]) => {
    setMappings(newMappings);
  }, []);

  // Handle AI column suggestion acceptance
  const handleAcceptColumnSuggestion = useCallback((suggestion: { sourceColumn: string; suggestedField: string | null }) => {
    if (!suggestion.suggestedField) return;

    const newMapping: ColumnMapping = {
      sourceColumn: suggestion.sourceColumn,
      targetField: suggestion.suggestedField,
    };

    setMappings((prev) => {
      // Check if this source column is already mapped
      const exists = prev.find((m) => m.sourceColumn === suggestion.sourceColumn);
      if (exists) {
        return prev.map((m) =>
          m.sourceColumn === suggestion.sourceColumn ? newMapping : m
        );
      }
      return [...prev, newMapping];
    });
  }, []);

  // Handle AI duplicate action
  const handleDuplicateAction = useCallback((row: number, action: string) => {
    setDuplicateActions((prev) => ({
      ...prev,
      [row]: action,
    }));
  }, []);

  // Refresh AI analysis
  const handleRefreshAI = useCallback(async () => {
    if (!parseResult?.preview || !entityType) return;

    await aiImport.runFullAnalysis(
      parseResult.sheets?.[0]?.headers || [],
      parseResult.preview,
      entityType,
      mappings
    );
  }, [parseResult, entityType, mappings, aiImport]);

  // Validate data
  const handleValidate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setValidationErrors([]);

    try {
      // Update job with mappings
      const response = await fetch("/api/excel/import", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: parseResult?.jobId,
          mappings,
          entityType,
          updateMode,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Validation failed");
      }

      // Run AI validation and duplicate check
      if (parseResult?.preview && mappings.length > 0) {
        await Promise.all([
          aiImport.validateImportData(parseResult.preview, entityType, mappings),
          aiImport.checkForDuplicates(parseResult.preview, entityType),
        ]);
      }

      // Move to validation step to show results
      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed");
    } finally {
      setIsLoading(false);
    }
  }, [parseResult, mappings, entityType, updateMode, aiImport]);

  // Process import — submits to background job queue, then polls for result
  const handleImport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setImportResult(null);

    try {
      // Submit to background queue
      const response = await fetch("/api/excel/import/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: parseResult?.jobId,
          data: parseResult?.preview,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Import failed");
      }

      const submitResult = await response.json();
      const bgJobId = submitResult.backgroundJobId;

      if (!bgJobId) {
        // Fallback: API returned direct result (no background job)
        setImportResult({
          processed: submitResult.processed || 0,
          success: submitResult.successCount || submitResult.success || 0,
          errors: submitResult.errors || [],
        });
        if ((submitResult.successCount || submitResult.success) > 0 && onSuccess) onSuccess();
        return;
      }

      // Poll for background job completion
      let attempts = 0;
      const maxAttempts = 300; // 5 minutes at 1s intervals
      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;

        const statusRes = await fetch(`/api/jobs/${bgJobId}`);
        if (!statusRes.ok) continue;

        const jobStatus = await statusRes.json();

        if (jobStatus.status === "completed") {
          const result = jobStatus.result as {
            processed: number;
            success: number;
            errorCount: number;
            errors: { row: number; message: string }[];
          };
          setImportResult({
            processed: result.processed,
            success: result.success,
            errors: result.errors,
          });
          if (result.success > 0 && onSuccess) onSuccess();
          return;
        }

        if (jobStatus.status === "failed" || jobStatus.status === "cancelled") {
          throw new Error(jobStatus.error || "Import job failed");
        }
      }

      throw new Error("Import job timed out after 5 minutes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsLoading(false);
    }
  }, [parseResult, onSuccess]);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return selectedFile !== null && parseResult !== null;
      case 2:
        return entityType !== "";
      case 3:
        return mappings.length > 0;
      case 4:
        // Allow proceeding if no critical errors
        const criticalErrors = aiImport.dataIssues.filter((i) => i.severity === "error").length;
        return criticalErrors === 0 || validationErrors.filter((e) => e.severity === "error").length === 0;
      case 5:
        return importResult !== null;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep === 3) {
      handleValidate();
    } else if (currentStep === 4) {
      setCurrentStep(5);
    } else if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Check if AI is currently loading
  const isAILoading = aiImport.isAnalyzing || aiImport.isDetectingEntity ||
    aiImport.isMappingColumns || aiImport.isValidating || aiImport.isCheckingDuplicates;

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isComplete = step.id < currentStep;

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
                    isActive && "bg-blue-100 text-blue-700",
                    isComplete && "bg-green-100 text-green-700",
                    !isActive && !isComplete && "text-gray-400"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      isActive && "bg-blue-600 text-white",
                      isComplete && "bg-green-600 text-white",
                      !isActive && !isComplete && "bg-gray-200"
                    )}
                  >
                    {isComplete ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-sm font-medium hidden sm:block">
                    {step.name}
                  </span>
                </div>

                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "w-8 h-0.5 mx-2",
                      step.id < currentStep ? "bg-green-600" : "bg-gray-200"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step content */}
      <div className="bg-white rounded-lg border p-6 min-h-[400px]">
        {/* Step 1: Upload */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Tải file lên</h3>
            <p className="text-gray-600">
              Chọn file Excel (.xlsx, .xls) hoặc CSV để import.
            </p>
            <FileUpload onFileSelect={handleFileSelect} disabled={isLoading} />
          </div>
        )}

        {/* Step 2: Select Type */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Chọn loại dữ liệu</h3>
            <p className="text-gray-600">
              Chọn loại dữ liệu bạn muốn import.
            </p>

            {/* AI Entity Suggestion */}
            {aiImport.entitySuggestion && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-purple-900">AI Đề xuất</span>
                  {aiImport.isDetectingEntity && (
                    <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                  )}
                </div>
                <p className="text-sm text-purple-800 mb-2">
                  Dựa trên phân tích headers và dữ liệu mẫu, AI nhận diện đây là dữ liệu{" "}
                  <span className="font-semibold">
                    {ENTITY_TYPES.find((t) => t.value === aiImport.entitySuggestion?.entityType)?.label ||
                      aiImport.entitySuggestion.entityType}
                  </span>{" "}
                  với độ tin cậy{" "}
                  <span className="font-semibold">
                    {Math.round((aiImport.entitySuggestion.confidence || 0) * 100)}%
                  </span>
                </p>
                {aiImport.entitySuggestion.reasoning && (
                  <p className="text-xs text-purple-600">
                    💡 {aiImport.entitySuggestion.reasoning}
                  </p>
                )}
                <button
                  onClick={() => handleEntityTypeSelect(aiImport.entitySuggestion!.entityType)}
                  className="mt-3 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                  <Check className="w-4 h-4" />
                  Sử dụng đề xuất này
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {ENTITY_TYPES.map((type) => {
                const isAISuggested = aiImport.entitySuggestion?.entityType === type.value;
                return (
                  <button
                    key={type.value}
                    onClick={() => handleEntityTypeSelect(type.value)}
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
        )}

        {/* Step 3: Map Columns */}
        {currentStep === 3 && parseResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Mapping cột dữ liệu</h3>
                <p className="text-gray-600">
                  Ghép nối các cột trong file với trường dữ liệu hệ thống.
                </p>
              </div>
              <button
                onClick={() => setShowAIPanel(!showAIPanel)}
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
                columnSuggestions={aiImport.columnSuggestions}
                onAcceptColumnSuggestion={handleAcceptColumnSuggestion}
                isLoading={aiImport.isMappingColumns}
                onRefresh={handleRefreshAI}
                collapsible={true}
                defaultExpanded={aiImport.columnSuggestions.length > 0}
              />
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chế độ cập nhật
              </label>
              <select
                value={updateMode}
                onChange={(e) =>
                  setUpdateMode(e.target.value as "insert" | "update" | "upsert")
                }
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
              onMappingChange={handleMappingChange}
              sampleData={parseResult.preview}
            />
          </div>
        )}

        {/* Step 4: Validate & Review */}
        {currentStep === 4 && (
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
                  {aiImport.summary?.newRecords || parseResult?.sheets[0]?.rowCount || 0}
                </p>
                <p className="text-sm text-green-600">Bản ghi mới</p>
              </div>
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-2xl font-bold text-orange-700">
                  {aiImport.duplicates.length}
                </p>
                <p className="text-sm text-orange-600">Trùng lặp</p>
              </div>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-2xl font-bold text-red-700">
                  {aiImport.summary?.errors || 0}
                </p>
                <p className="text-sm text-red-600">Lỗi</p>
              </div>
            </div>

            {/* AI Suggestions Panel with Issues and Duplicates */}
            <AISuggestionsPanel
              dataIssues={aiImport.dataIssues}
              duplicates={aiImport.duplicates}
              duplicateResolutions={aiImport.duplicateResolutions}
              onAcceptDuplicateAction={handleDuplicateAction}
              isLoading={aiImport.isValidating || aiImport.isCheckingDuplicates}
              onRefresh={handleRefreshAI}
              collapsible={false}
              defaultExpanded={true}
            />

            {/* Warning if there are errors */}
            {(aiImport.summary?.errors || 0) > 0 && (
              <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Có {aiImport.summary?.errors} lỗi cần xử lý</p>
                  <p className="text-sm">
                    Bạn vẫn có thể tiếp tục import, nhưng các dòng có lỗi sẽ bị bỏ qua.
                  </p>
                </div>
              </div>
            )}

            {/* No issues message */}
            {aiImport.dataIssues.length === 0 && aiImport.duplicates.length === 0 && (
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
        )}

        {/* Step 5: Import */}
        {currentStep === 5 && (
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
                    {aiImport.duplicates.length > 0 && (
                      <li><span className="text-gray-500">Bản ghi trùng:</span> {aiImport.duplicates.length} (sẽ xử lý theo cài đặt)</li>
                    )}
                  </ul>
                </div>

                <button
                  onClick={handleImport}
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
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 1 || isLoading}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </button>

        {currentStep < 5 && currentStep !== 2 && (
          <button
            onClick={handleNext}
            disabled={!canProceed() || isLoading || isAILoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isAILoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang phân tích...
              </>
            ) : currentStep === 3 ? (
              <>
                Kiểm tra
                <ArrowRight className="w-4 h-4" />
              </>
            ) : currentStep === 4 ? (
              <>
                Tiếp tục Import
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                Tiếp theo
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
