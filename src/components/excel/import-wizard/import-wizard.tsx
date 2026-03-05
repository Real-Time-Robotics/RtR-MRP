"use client";

// src/components/excel/import-wizard/import-wizard.tsx
// Multi-Step Import Wizard Component with AI Integration (Refactored)
// 6 steps: Upload → Entity Type → Column Mapping → Validation → Data Cleansing → Import

import { useState, useCallback } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useAIImport } from "@/hooks/use-ai-import";
import type {
  ColumnMapping,
  FieldDefinition,
  ParseResult,
  ValidationError,
  ImportResult,
  ImportWizardProps,
} from "./import-wizard-types";
import { StepIndicator } from "./step-indicator";
import { StepFileUpload } from "./step-file-upload";
import { StepEntityType } from "./step-entity-type";
import { StepColumnMapping } from "./step-column-mapping";
import { StepValidation } from "./step-validation";
import { StepDataCleansing } from "./step-data-cleansing";
import { StepImportConfirm } from "./step-import-confirm";

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
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const [targetFields, setTargetFields] = useState<FieldDefinition[]>([]);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [duplicateActions, setDuplicateActions] = useState<Record<number, string>>({});

  // Cleansed data for step 5
  const [cleansedData, setCleansedData] = useState<Record<string, unknown>[] | null>(null);

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

  // Handle data cleansing changes
  const handleCleansedDataChange = useCallback((updatedData: Record<string, unknown>[]) => {
    setCleansedData(updatedData);
    // Also update parseResult preview so import uses cleansed data
    if (parseResult) {
      setParseResult({
        ...parseResult,
        preview: updatedData,
      });
    }
  }, [parseResult]);

  // Process import -- submits to background job queue, then polls for result
  const handleImport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setImportResult(null);

    try {
      // Use cleansed data if available, otherwise use original
      const importData = cleansedData || parseResult?.preview;

      // Submit to background queue
      const response = await fetch("/api/excel/import/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: parseResult?.jobId,
          data: importData,
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
  }, [parseResult, cleansedData, onSuccess]);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return selectedFile !== null && parseResult !== null;
      case 2:
        return entityType !== "";
      case 3:
        return mappings.length > 0;
      case 4: {
        // Allow proceeding if no critical errors
        const criticalErrors = aiImport.dataIssues.filter((i) => i.severity === "error").length;
        return criticalErrors === 0 || validationErrors.filter((e) => e.severity === "error").length === 0;
      }
      case 5:
        // Data cleansing - always can proceed (optional step)
        return true;
      case 6:
        return importResult !== null;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep === 3) {
      handleValidate();
    } else if (currentStep === 4) {
      // Initialize cleansed data from current preview
      if (parseResult?.preview && !cleansedData) {
        setCleansedData([...parseResult.preview]);
      }
      setCurrentStep(5);
    } else if (currentStep === 5) {
      setCurrentStep(6);
    } else if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Check if AI is currently loading
  const isAILoading = aiImport.isAnalyzing || aiImport.isDetectingEntity ||
    aiImport.isMappingColumns || aiImport.isValidating || aiImport.isCheckingDuplicates;

  const handleBack = () => {
    if (currentStep > 1) {
      // Reset cleansed data and validation when navigating back
      // so stale results don't persist when mappings change
      if (currentStep <= 5) {
        setCleansedData(null);
      }
      // Going back to step 3 (mapping) invalidates validation results
      if (currentStep === 4) {
        aiImport.reset();
        setValidationErrors([]);
      }
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <StepIndicator currentStep={currentStep} />

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step content */}
      <div className="relative bg-white rounded-lg border p-6 min-h-[400px]">
        {/* Step 1: Upload */}
        {currentStep === 1 && (
          <StepFileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />
        )}

        {/* Step 2: Select Type */}
        {currentStep === 2 && (
          <StepEntityType
            entityType={entityType}
            isLoading={isLoading}
            entitySuggestion={aiImport.entitySuggestion}
            isDetectingEntity={aiImport.isDetectingEntity}
            onEntityTypeSelect={handleEntityTypeSelect}
          />
        )}

        {/* Step 3: Map Columns */}
        {currentStep === 3 && parseResult && (
          <StepColumnMapping
            parseResult={parseResult}
            targetFields={targetFields}
            mappings={mappings}
            updateMode={updateMode}
            showAIPanel={showAIPanel}
            columnSuggestions={aiImport.columnSuggestions}
            isMappingColumns={aiImport.isMappingColumns}
            entityType={entityType}
            onMappingChange={handleMappingChange}
            onUpdateModeChange={setUpdateMode}
            onToggleAIPanel={() => setShowAIPanel(!showAIPanel)}
            onAcceptColumnSuggestion={handleAcceptColumnSuggestion}
            onRefreshAI={handleRefreshAI}
          />
        )}

        {/* Step 4: Validate & Review */}
        {currentStep === 4 && (
          <StepValidation
            parseResult={parseResult}
            summary={aiImport.summary}
            dataIssues={aiImport.dataIssues}
            duplicates={aiImport.duplicates}
            duplicateResolutions={aiImport.duplicateResolutions}
            isValidating={aiImport.isValidating}
            isCheckingDuplicates={aiImport.isCheckingDuplicates}
            onAcceptDuplicateAction={handleDuplicateAction}
            onRefreshAI={handleRefreshAI}
          />
        )}

        {/* Step 5: Data Cleansing */}
        {currentStep === 5 && (
          <StepDataCleansing
            data={cleansedData || parseResult?.preview || []}
            mappings={mappings}
            dataIssues={aiImport.dataIssues}
            onDataChange={handleCleansedDataChange}
          />
        )}

        {/* Step 6: Import */}
        {currentStep === 6 && (
          <StepImportConfirm
            parseResult={parseResult}
            entityType={entityType}
            updateMode={updateMode}
            mappings={mappings}
            duplicatesCount={aiImport.duplicates.length}
            importResult={importResult}
            isLoading={isLoading}
            onImport={handleImport}
            onClose={onClose}
          />
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between sticky bottom-0 bg-white py-3 border-t -mx-6 px-6 mt-4 sm:static sm:bg-transparent sm:py-0 sm:border-0 sm:mx-0 sm:px-0 sm:mt-0">
        <button
          onClick={handleBack}
          disabled={currentStep === 1 || isLoading}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </button>

        {currentStep < 6 && currentStep !== 2 && (
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
                Chỉnh sửa dữ liệu
                <ArrowRight className="w-4 h-4" />
              </>
            ) : currentStep === 5 ? (
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
