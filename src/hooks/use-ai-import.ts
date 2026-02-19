// src/hooks/use-ai-import.ts
// React hook for AI-enhanced Excel import

import { useState, useCallback } from "react";
import type {
  AIColumnSuggestion,
  AIEntitySuggestion,
  DataIssue,
  DuplicateMatch,
  AIDuplicateResolution,
  ColumnMapping,
} from "@/lib/excel";

// =============================================================================
// TYPES
// =============================================================================

export interface AIImportState {
  // Loading states
  isAnalyzing: boolean;
  isDetectingEntity: boolean;
  isMappingColumns: boolean;
  isValidating: boolean;
  isCheckingDuplicates: boolean;

  // Results
  entitySuggestion: AIEntitySuggestion | null;
  columnSuggestions: AIColumnSuggestion[];
  dataIssues: DataIssue[];
  duplicates: DuplicateMatch[];
  duplicateResolutions: AIDuplicateResolution[];

  // Summary
  summary: {
    totalIssues: number;
    errors: number;
    warnings: number;
    duplicatesFound: number;
    newRecords: number;
  } | null;

  // Error
  error: string | null;
}

export interface AIAnalysisOptions {
  useAI?: boolean;
  checkDuplicates?: boolean;
  validateData?: boolean;
  confidenceThreshold?: number;
}

export interface UseAIImportReturn extends AIImportState {
  // Actions
  analyzeFile: (
    headers: string[],
    sampleData: Record<string, unknown>[],
    options?: AIAnalysisOptions
  ) => Promise<void>;

  suggestMappings: (
    sourceColumns: string[],
    entityType: string,
    sampleData: Record<string, unknown>[],
    options?: AIAnalysisOptions
  ) => Promise<void>;

  validateImportData: (
    fullData: Record<string, unknown>[],
    entityType: string,
    mappings: ColumnMapping[],
    options?: AIAnalysisOptions
  ) => Promise<void>;

  checkForDuplicates: (
    fullData: Record<string, unknown>[],
    entityType: string,
    identifierColumn?: string
  ) => Promise<void>;

  runFullAnalysis: (
    headers: string[],
    fullData: Record<string, unknown>[],
    entityType?: string,
    mappings?: ColumnMapping[],
    options?: AIAnalysisOptions
  ) => Promise<void>;

  // Utilities
  applyColumnSuggestion: (suggestion: AIColumnSuggestion) => ColumnMapping | null;
  acceptDuplicateResolution: (resolution: AIDuplicateResolution) => void;
  clearResults: () => void;
  reset: () => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: AIImportState = {
  isAnalyzing: false,
  isDetectingEntity: false,
  isMappingColumns: false,
  isValidating: false,
  isCheckingDuplicates: false,
  entitySuggestion: null,
  columnSuggestions: [],
  dataIssues: [],
  duplicates: [],
  duplicateResolutions: [],
  summary: null,
  error: null,
};

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useAIImport(): UseAIImportReturn {
  const [state, setState] = useState<AIImportState>(initialState);

  // Helper to update state
  const updateState = useCallback((updates: Partial<AIImportState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // API call helper
  const callAIAPI = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/excel/import/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.status}`);
    }

    return response.json();
  };

  // ==========================================================================
  // ANALYZE FILE (Entity Detection)
  // ==========================================================================
  const analyzeFile = useCallback(
    async (
      headers: string[],
      sampleData: Record<string, unknown>[],
      options: AIAnalysisOptions = {}
    ) => {
      updateState({ isDetectingEntity: true, error: null });

      try {
        const result = await callAIAPI({
          headers,
          sampleData,
          options: { useAI: options.useAI ?? true },
        });

        updateState({
          isDetectingEntity: false,
          entitySuggestion: result.entityDetection || null,
        });
      } catch (error) {
        updateState({
          isDetectingEntity: false,
          error: error instanceof Error ? error.message : "Failed to analyze file",
        });
      }
    },
    [updateState]
  );

  // ==========================================================================
  // SUGGEST MAPPINGS
  // ==========================================================================
  const suggestMappings = useCallback(
    async (
      sourceColumns: string[],
      entityType: string,
      sampleData: Record<string, unknown>[],
      options: AIAnalysisOptions = {}
    ) => {
      updateState({ isMappingColumns: true, error: null });

      try {
        const result = await callAIAPI({
          sourceColumns,
          entityType,
          sampleData,
          options: {
            useAI: options.useAI ?? true,
            confidenceThreshold: options.confidenceThreshold ?? 0.7,
          },
        });

        const suggestions = result.columnMapping?.aiSuggestions ||
          result.aiColumnSuggestions ||
          [];

        updateState({
          isMappingColumns: false,
          columnSuggestions: suggestions,
        });
      } catch (error) {
        updateState({
          isMappingColumns: false,
          error: error instanceof Error ? error.message : "Failed to suggest mappings",
        });
      }
    },
    [updateState]
  );

  // ==========================================================================
  // VALIDATE IMPORT DATA
  // ==========================================================================
  const validateImportData = useCallback(
    async (
      fullData: Record<string, unknown>[],
      entityType: string,
      mappings: ColumnMapping[],
      options: AIAnalysisOptions = {}
    ) => {
      updateState({ isValidating: true, error: null });

      try {
        const result = await callAIAPI({
          fullData,
          entityType,
          mappings,
          options: {
            useAI: options.useAI ?? true,
            validateData: true,
          },
        });

        const validation = result.dataValidation || {};

        updateState({
          isValidating: false,
          dataIssues: validation.issues || [],
          summary: {
            totalIssues: validation.summary?.totalIssues || 0,
            errors: validation.summary?.errors || 0,
            warnings: validation.summary?.warnings || 0,
            duplicatesFound: state.duplicates.length,
            newRecords: 0,
          },
        });
      } catch (error) {
        updateState({
          isValidating: false,
          error: error instanceof Error ? error.message : "Failed to validate data",
        });
      }
    },
    [updateState, state.duplicates.length]
  );

  // ==========================================================================
  // CHECK FOR DUPLICATES
  // ==========================================================================
  const checkForDuplicates = useCallback(
    async (
      fullData: Record<string, unknown>[],
      entityType: string,
      identifierColumn?: string
    ) => {
      updateState({ isCheckingDuplicates: true, error: null });

      try {
        const result = await callAIAPI({
          fullData,
          entityType,
          identifierColumn,
          options: {
            useAI: true,
            checkDuplicates: true,
          },
        });

        const duplicateCheck = result.duplicateCheck || {};
        const resolutions = result.duplicateResolutions || [];

        updateState({
          isCheckingDuplicates: false,
          duplicates: duplicateCheck.duplicates || [],
          duplicateResolutions: resolutions,
          summary: {
            ...state.summary,
            totalIssues: state.summary?.totalIssues || 0,
            errors: state.summary?.errors || 0,
            warnings: state.summary?.warnings || 0,
            duplicatesFound: duplicateCheck.summary?.exactDuplicates || 0,
            newRecords: duplicateCheck.summary?.newRecords || 0,
          },
        });
      } catch (error) {
        updateState({
          isCheckingDuplicates: false,
          error: error instanceof Error ? error.message : "Failed to check duplicates",
        });
      }
    },
    [updateState, state.summary]
  );

  // ==========================================================================
  // RUN FULL ANALYSIS
  // ==========================================================================
  const runFullAnalysis = useCallback(
    async (
      headers: string[],
      fullData: Record<string, unknown>[],
      entityType?: string,
      mappings?: ColumnMapping[],
      options: AIAnalysisOptions = {}
    ) => {
      updateState({ isAnalyzing: true, error: null });

      try {
        const result = await callAIAPI({
          headers,
          sampleData: fullData.slice(0, 10),
          fullData,
          entityType,
          sourceColumns: headers,
          mappings,
          options: {
            useAI: options.useAI ?? true,
            checkDuplicates: options.checkDuplicates ?? true,
            validateData: options.validateData ?? true,
            confidenceThreshold: options.confidenceThreshold ?? 0.7,
          },
        });

        const entityDetection = result.entityDetection;
        const columnMapping = result.columnMapping;
        const dataValidation = result.dataValidation;
        const duplicateCheck = result.duplicateCheck;
        const duplicateResolutions = result.duplicateResolutions;

        updateState({
          isAnalyzing: false,
          entitySuggestion: entityDetection || null,
          columnSuggestions: columnMapping?.aiSuggestions || [],
          dataIssues: dataValidation?.issues || [],
          duplicates: duplicateCheck?.duplicates || [],
          duplicateResolutions: duplicateResolutions || [],
          summary: {
            totalIssues: dataValidation?.summary?.totalIssues || 0,
            errors: dataValidation?.summary?.errors || 0,
            warnings: dataValidation?.summary?.warnings || 0,
            duplicatesFound: duplicateCheck?.summary?.exactDuplicates || 0,
            newRecords: duplicateCheck?.summary?.newRecords || fullData.length,
          },
        });
      } catch (error) {
        updateState({
          isAnalyzing: false,
          error: error instanceof Error ? error.message : "Failed to analyze data",
        });
      }
    },
    [updateState]
  );

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  const applyColumnSuggestion = useCallback(
    (suggestion: AIColumnSuggestion): ColumnMapping | null => {
      if (!suggestion.suggestedField || suggestion.confidence < 0.5) {
        return null;
      }

      return {
        sourceColumn: suggestion.sourceColumn,
        targetField: suggestion.suggestedField,
      };
    },
    []
  );

  const acceptDuplicateResolution = useCallback(
    (_resolution: AIDuplicateResolution) => {
      // Mark this resolution as accepted - could be used to update UI state
    },
    []
  );

  const clearResults = useCallback(() => {
    updateState({
      entitySuggestion: null,
      columnSuggestions: [],
      dataIssues: [],
      duplicates: [],
      duplicateResolutions: [],
      summary: null,
      error: null,
    });
  }, [updateState]);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    analyzeFile,
    suggestMappings,
    validateImportData,
    checkForDuplicates,
    runFullAnalysis,
    applyColumnSuggestion,
    acceptDuplicateResolution,
    clearResults,
    reset,
  };
}

export default useAIImport;
