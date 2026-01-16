"use client";

// src/components/excel/import-wizard.tsx
// Multi-Step Import Wizard Component

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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FileUpload } from "./file-upload";
import { ColumnMapper } from "./column-mapper";

interface ImportStep {
  id: number;
  name: string;
  icon: React.ElementType;
}

const STEPS: ImportStep[] = [
  { id: 1, name: "Upload File", icon: Upload },
  { id: 2, name: "Select Type", icon: FileCheck },
  { id: 3, name: "Map Columns", icon: Columns },
  { id: 4, name: "Validate", icon: CheckCircle },
  { id: 5, name: "Import", icon: Play },
];

const ENTITY_TYPES = [
  { value: "parts", label: "Parts", description: "Import part master data" },
  { value: "suppliers", label: "Suppliers", description: "Import supplier information" },
  { value: "products", label: "Products", description: "Import product catalog" },
  { value: "customers", label: "Customers", description: "Import customer data" },
  { value: "inventory", label: "Inventory", description: "Import stock levels" },
  { value: "bom", label: "Bill of Materials", description: "Import BOM structures" },
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

  // Handle file selection and upload
  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setError(null);
    setIsLoading(true);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

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
        }
      }

      setCurrentStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load fields");
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, parseResult]);

  // Handle mapping change
  const handleMappingChange = useCallback((newMappings: ColumnMapping[]) => {
    setMappings(newMappings);
  }, []);

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

      // For now, just move to next step
      // In a full implementation, we would validate the data on the server
      setCurrentStep(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed");
    } finally {
      setIsLoading(false);
    }
  }, [parseResult, mappings, entityType, updateMode]);

  // Process import
  const handleImport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setImportResult(null);

    try {
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

      const result = await response.json();
      setImportResult(result);

      // Call onSuccess callback if import was successful
      if (result.successCount > 0 && onSuccess) {
        onSuccess();
      }
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
        return validationErrors.filter((e) => e.severity === "error").length === 0;
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
            <h3 className="text-lg font-semibold">Upload Your File</h3>
            <p className="text-gray-600">
              Select an Excel (.xlsx, .xls) or CSV file to import.
            </p>
            <FileUpload onFileSelect={handleFileSelect} disabled={isLoading} />
          </div>
        )}

        {/* Step 2: Select Type */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Select Data Type</h3>
            <p className="text-gray-600">
              Choose what type of data you are importing.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {ENTITY_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleEntityTypeSelect(type.value)}
                  disabled={isLoading}
                  className={cn(
                    "p-4 border rounded-lg text-left transition-colors hover:border-blue-500",
                    entityType === type.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200"
                  )}
                >
                  <p className="font-medium">{type.label}</p>
                  <p className="text-sm text-gray-500">{type.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Map Columns */}
        {currentStep === 3 && parseResult && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Map Columns</h3>
            <p className="text-gray-600">
              Match your file columns to the system fields.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Update Mode
              </label>
              <select
                value={updateMode}
                onChange={(e) =>
                  setUpdateMode(e.target.value as "insert" | "update" | "upsert")
                }
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="insert">Insert new records only</option>
                <option value="update">Update existing records only</option>
                <option value="upsert">Insert or update (upsert)</option>
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

        {/* Step 4: Validate (now skipped, goes directly to step 5) */}

        {/* Step 5: Import */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Import Data</h3>

            {!importResult && (
              <>
                <p className="text-gray-600">
                  Ready to import {parseResult?.sheets[0]?.rowCount || 0} rows.
                </p>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Import Summary</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>File: {parseResult?.fileName}</li>
                    <li>Entity Type: {entityType}</li>
                    <li>Rows: {parseResult?.sheets[0]?.rowCount || 0}</li>
                    <li>Mode: {updateMode}</li>
                    <li>Mappings: {mappings.length} columns</li>
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
                      Importing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Start Import
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
                      ? "Import Completed Successfully!"
                      : "Import Completed with Errors"}
                  </h4>
                  <ul className="text-sm space-y-1">
                    <li>Processed: {importResult.processed} rows</li>
                    <li className="text-green-700">
                      Successful: {importResult.success} rows
                    </li>
                    {importResult.errors.length > 0 && (
                      <li className="text-red-700">
                        Errors: {importResult.errors.length} rows
                      </li>
                    )}
                  </ul>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-red-50 px-4 py-2 border-b">
                      <h5 className="font-medium text-red-700">Error Details</h5>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left">Row</th>
                            <th className="px-4 py-2 text-left">Error</th>
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
          Back
        </button>

        {currentStep < 5 && currentStep !== 2 && (
          <button
            onClick={handleNext}
            disabled={!canProceed() || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
