// src/app/api/excel/import/ai/route.ts
// AI-Enhanced Excel Import API

import { NextRequest, NextResponse } from "next/server";
import { z } from 'zod';
import { withAuth } from '@/lib/api/with-auth';
import {
  aiDetectEntityType,
  aiSuggestMappings,
  aiEnhancedAutoMapping,
  shouldUseAI,
} from "@/lib/excel/ai-mapper";
import {
  aiDetectDataIssues,
  quickValidateData,
} from "@/lib/excel/ai-validator";
import {
  checkDuplicates,
  aiSuggestDuplicateResolution,
  getIdentifierField,
} from "@/lib/excel/duplicate-detector";
import { autoDetectMappings, ColumnMapping } from "@/lib/excel/mapper";
import { detectEntityType } from "@/lib/excel/parser";
import { logger } from '@/lib/logger';

import { checkWriteEndpointLimit, checkReadEndpointLimit } from '@/lib/rate-limit';
// =============================================================================
// TYPES
// =============================================================================

interface AIAnalysisRequest {
  // For entity detection
  headers?: string[];
  sampleData?: Record<string, unknown>[];

  // For column mapping
  entityType?: string;
  unmappedColumns?: string[];
  sourceColumns?: string[];

  // For validation
  fullData?: Record<string, unknown>[];
  mappings?: ColumnMapping[];

  // For duplicate check
  identifierColumn?: string;

  // Options
  options?: {
    useAI?: boolean;
    checkDuplicates?: boolean;
    validateData?: boolean;
    confidenceThreshold?: number;
  };
}

// =============================================================================
// POST - AI-Enhanced Analysis
// =============================================================================

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    // Authentication check
    const bodySchema = z.object({
      headers: z.array(z.string()).optional(),
      sampleData: z.array(z.record(z.string(), z.unknown())).optional(),
      entityType: z.string().optional(),
      unmappedColumns: z.array(z.string()).optional(),
      sourceColumns: z.array(z.string()).optional(),
      fullData: z.array(z.record(z.string(), z.unknown())).optional(),
      mappings: z.array(z.record(z.string(), z.unknown())).optional(),
      identifierColumn: z.string().optional(),
      options: z.object({
        useAI: z.boolean().optional(),
        checkDuplicates: z.boolean().optional(),
        validateData: z.boolean().optional(),
        confidenceThreshold: z.number().optional(),
      }).default({}),
    });

    const rawBody = await request.json();
    const parseResult = bodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body: AIAnalysisRequest = parseResult.data as AIAnalysisRequest;
    const {
      headers,
      sampleData,
      entityType,
      unmappedColumns,
      sourceColumns,
      fullData,
      mappings,
      identifierColumn,
      options = {},
    } = body;

    const results: Record<string, unknown> = {};

    // =========================================================================
    // 1. AI Entity Type Detection
    // =========================================================================
    if (headers && sampleData && !entityType) {
      // First try rule-based detection
      const ruleBasedDetection = detectEntityType(headers);

      if (ruleBasedDetection.confidence >= 0.7) {
        // High confidence - use rule-based result
        results.entityDetection = {
          entityType: ruleBasedDetection.entityType,
          confidence: ruleBasedDetection.confidence,
          matchedHeaders: ruleBasedDetection.matchedHeaders,
          source: "rules",
        };
      } else if (options.useAI !== false) {
        // Low confidence - use AI
        const aiDetection = await aiDetectEntityType(headers, sampleData);
        results.entityDetection = {
          ...aiDetection,
          source: "ai",
          ruleBasedResult: ruleBasedDetection,
        };
      } else {
        // AI disabled, return rule-based with warning
        results.entityDetection = {
          ...ruleBasedDetection,
          source: "rules",
          lowConfidenceWarning: true,
        };
      }
    }

    // =========================================================================
    // 2. AI Column Mapping
    // =========================================================================
    if (sourceColumns && entityType && sampleData) {
      // First try rule-based auto-mapping
      const autoMapping = autoDetectMappings(sourceColumns, entityType);

      // Check if AI should be used
      const mappingCheckResult = {
        unmappedColumns: autoMapping.unmappedColumns,
        mappings: autoMapping.mappings.map((m) => ({ confidence: 1.0 })),
      };
      if (options.useAI !== false && shouldUseAI(mappingCheckResult)) {
        // Use enhanced mapping with AI
        const enhancedMapping = await aiEnhancedAutoMapping(
          sourceColumns,
          entityType,
          sampleData,
          { confidenceThreshold: options.confidenceThreshold || 0.7 }
        );

        results.columnMapping = {
          mappings: enhancedMapping.mappings,
          unmappedColumns: enhancedMapping.unmappedColumns,
          aiSuggestions: enhancedMapping.aiSuggestions,
          source: "enhanced",
        };
      } else {
        // Use rule-based only
        results.columnMapping = {
          mappings: autoMapping.mappings.map((m) => ({
            sourceColumn: m.sourceColumn,
            targetField: m.targetField,
            confidence: 1.0,
            isAISuggested: false,
          })),
          unmappedColumns: autoMapping.unmappedColumns,
          missingRequiredFields: autoMapping.missingRequiredFields,
          source: "rules",
        };
      }
    } else if (unmappedColumns && entityType && sampleData) {
      // Only get AI suggestions for specific unmapped columns
      if (options.useAI !== false && unmappedColumns.length > 0) {
        const aiSuggestions = await aiSuggestMappings(
          unmappedColumns,
          entityType,
          sampleData
        );
        results.aiColumnSuggestions = aiSuggestions;
      }
    }

    // =========================================================================
    // 3. Data Validation & Issue Detection
    // =========================================================================
    if (options.validateData && fullData && entityType && mappings) {
      if (options.useAI !== false) {
        // Full AI-enhanced validation
        const validationResult = await aiDetectDataIssues(
          fullData,
          entityType,
          mappings
        );
        results.dataValidation = validationResult;
      } else {
        // Quick rule-based validation only
        const quickIssues = quickValidateData(fullData, entityType, mappings);
        results.dataValidation = {
          issues: quickIssues,
          summary: {
            totalIssues: quickIssues.length,
            errors: quickIssues.filter((i) => i.severity === "error").length,
            warnings: quickIssues.filter((i) => i.severity === "warning").length,
          },
          source: "quick",
        };
      }
    }

    // =========================================================================
    // 4. Duplicate Detection
    // =========================================================================
    if (options.checkDuplicates && fullData && entityType) {
      // Determine identifier column
      const idColumn = identifierColumn || getIdentifierField(entityType);

      if (idColumn) {
        const duplicateResult = await checkDuplicates(
          fullData,
          entityType,
          idColumn,
          { checkSimilar: options.useAI !== false }
        );

        results.duplicateCheck = {
          ...duplicateResult,
          identifierColumn: idColumn,
        };

        // Get AI resolution suggestions if there are duplicates
        if (
          options.useAI !== false &&
          duplicateResult.duplicates.length > 0
        ) {
          const aiResolutions = await aiSuggestDuplicateResolution(
            duplicateResult.duplicates,
            fullData,
            entityType
          );
          results.duplicateResolutions = aiResolutions;
        }
      } else {
        results.duplicateCheck = {
          error: "No identifier field found for entity type",
          entityType,
        };
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/excel/import/ai' });

    return NextResponse.json(
      {
        error: "AI analysis failed",
        message: "An unexpected error occurred during AI analysis",
      },
      { status: 500 }
    );
  }
});

// =============================================================================
// GET - Get AI Analysis Capabilities
// =============================================================================

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
return NextResponse.json({
      capabilities: {
        entityDetection: {
          description: "AI-powered entity type detection from Excel headers",
          supported: true,
          fallback: "Rule-based detection with keyword matching",
        },
        columnMapping: {
          description: "AI-enhanced column mapping with Vietnamese support",
          supported: true,
          fallback: "Keyword alias matching",
        },
        dataValidation: {
          description: "AI-powered data issue detection",
          supported: true,
          fallback: "Rule-based validation",
        },
        duplicateDetection: {
          description: "Database duplicate checking with AI resolution",
          supported: true,
          fallback: "Exact match checking",
        },
      },
      supportedEntityTypes: [
        "parts",
        "suppliers",
        "products",
        "customers",
        "inventory",
        "bom",
      ],
      vietnameseSupport: {
        enabled: true,
        description: "Automatic detection of Vietnamese column headers",
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/excel/import/ai' });
    return NextResponse.json(
      { error: "Failed to get AI capabilities" },
      { status: 500 }
    );
  }
});
