// src/lib/excel/ai-mapper.ts
// AI-Powered Column Mapping and Entity Detection

import { getAIProvider } from "@/lib/ai/provider";
import { FieldDefinition, entityFieldDefinitions } from "./mapper";
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface AIColumnSuggestion {
  sourceColumn: string;
  suggestedField: string | null;
  confidence: number; // 0.0 - 1.0
  reasoning: string;
  alternatives?: { field: string; confidence: number }[];
}

export interface AIEntitySuggestion {
  entityType: string;
  confidence: number; // 0.0 - 1.0
  reasoning: string;
  alternativeTypes?: { type: string; confidence: number }[];
}

export interface AIMapperOptions {
  maxSampleRows?: number;
  confidenceThreshold?: number;
  language?: "en" | "vi" | "auto";
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_OPTIONS: AIMapperOptions = {
  maxSampleRows: 5,
  confidenceThreshold: 0.7,
  language: "auto",
};

const ENTITY_DESCRIPTIONS: Record<string, string> = {
  parts: "Part/component master data (part numbers, descriptions, costs, units)",
  suppliers: "Supplier/vendor information (supplier codes, contact info, lead times)",
  inventory: "Stock/inventory levels (quantities, warehouses, lot numbers)",
  products: "Finished goods/products (SKUs, prices, assembly hours)",
  customers: "Customer data (customer codes, addresses, credit limits)",
  bom: "Bill of Materials (parent/child relationships, quantities per assembly)",
};

// =============================================================================
// AI ENTITY TYPE DETECTION
// =============================================================================

/**
 * AI-powered entity type detection
 * Use when keyword-based detection has low confidence
 */
export async function aiDetectEntityType(
  headers: string[],
  sampleData: Record<string, unknown>[],
  options: AIMapperOptions = {}
): Promise<AIEntitySuggestion> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const ai = getAIProvider();

  // Prepare sample data (limit rows to reduce token usage)
  const limitedSampleData = sampleData.slice(0, opts.maxSampleRows);

  const prompt = `Analyze this Excel/CSV file and determine what type of data it contains.

Headers: ${headers.join(", ")}

Sample data (first ${limitedSampleData.length} rows):
${JSON.stringify(limitedSampleData, null, 2)}

Possible entity types and their descriptions:
${Object.entries(ENTITY_DESCRIPTIONS)
  .map(([type, desc]) => `- ${type}: ${desc}`)
  .join("\n")}

Instructions:
1. Analyze the headers and sample values
2. Consider both English and Vietnamese column names
3. Match patterns to determine the most likely entity type
4. Provide a confidence score (0.0 to 1.0)

Respond ONLY in valid JSON format (no markdown, no explanation):
{
  "entityType": "parts|suppliers|inventory|products|customers|bom",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation in Vietnamese",
  "alternativeTypes": [{"type": "string", "confidence": 0.0-1.0}]
}`;

  try {
    const response = await ai.chat({
      messages: [
        {
          role: "system",
          content:
            "You are an expert at analyzing manufacturing and ERP data. Respond only in valid JSON format without markdown code blocks.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      maxTokens: 300,
    });

    // Clean response - remove markdown code blocks if present
    let content = response.content.trim();
    if (content.startsWith("```")) {
      content = content.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    }

    const result = JSON.parse(content);

    return {
      entityType: result.entityType || "parts",
      confidence: Math.min(1, Math.max(0, result.confidence || 0.5)),
      reasoning: result.reasoning || "AI analysis completed",
      alternativeTypes: result.alternativeTypes,
    };
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'ai-mapper', operation: 'detectEntityType' });

    // Return fallback response
    return {
      entityType: "parts",
      confidence: 0.3,
      reasoning: "Không thể phân tích AI. Mặc định là parts.",
      alternativeTypes: [],
    };
  }
}

// =============================================================================
// AI COLUMN MAPPING SUGGESTIONS
// =============================================================================

/**
 * AI-powered column mapping suggestions for unmapped columns
 * Only call for columns that couldn't be matched via keywords
 */
export async function aiSuggestMappings(
  unmappedColumns: string[],
  entityType: string,
  sampleData: Record<string, unknown>[],
  options: AIMapperOptions = {}
): Promise<AIColumnSuggestion[]> {
  // Return empty if no unmapped columns
  if (unmappedColumns.length === 0) {
    return [];
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const ai = getAIProvider();
  const fields = entityFieldDefinitions[entityType] || [];

  // Skip if no fields defined for entity type
  if (fields.length === 0) {
    return unmappedColumns.map((col) => ({
      sourceColumn: col,
      suggestedField: null,
      confidence: 0,
      reasoning: "No field definitions available for entity type",
    }));
  }

  // Get sample values for each unmapped column
  const columnSamples = unmappedColumns.map((col) => ({
    column: col,
    samples: sampleData
      .slice(0, opts.maxSampleRows)
      .map((row) => row[col])
      .filter((v) => v != null && v !== ""),
  }));

  const prompt = `I have ${unmappedColumns.length} Excel columns that couldn't be automatically mapped.

Unmapped columns with sample values:
${columnSamples
  .map((c) => `- "${c.column}": ${JSON.stringify(c.samples.slice(0, 3))}`)
  .join("\n")}

Available target fields for ${entityType}:
${fields.map((f) => `- ${f.key}: ${f.label} (${f.type}${f.required ? ", required" : ""})`).join("\n")}

For each unmapped column, suggest the best matching field or null if no match.
Consider:
1. Column name meaning (Vietnamese: mã = code, tên = name, số lượng = quantity, etc.)
2. Data type compatibility (numbers, text, dates)
3. Sample value patterns

Respond ONLY in valid JSON array format (no markdown):
[
  {
    "sourceColumn": "column name",
    "suggestedField": "field key or null",
    "confidence": 0.0-1.0,
    "reasoning": "Brief explanation in Vietnamese"
  }
]`;

  try {
    const response = await ai.chat({
      messages: [
        {
          role: "system",
          content:
            "You are an expert at data mapping for manufacturing ERP systems. You understand both English and Vietnamese column names. Respond only in valid JSON array format without markdown code blocks.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      maxTokens: 600,
    });

    // Clean response - remove markdown code blocks if present
    let content = response.content.trim();
    if (content.startsWith("```")) {
      content = content.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    }

    const results: AIColumnSuggestion[] = JSON.parse(content);

    // Validate and normalize results
    return results.map((result) => ({
      sourceColumn: result.sourceColumn,
      suggestedField: result.suggestedField || null,
      confidence: Math.min(1, Math.max(0, result.confidence || 0)),
      reasoning: result.reasoning || "",
      alternatives: result.alternatives,
    }));
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'ai-mapper', operation: 'suggestMappings' });

    // Return empty suggestions on error
    return unmappedColumns.map((col) => ({
      sourceColumn: col,
      suggestedField: null,
      confidence: 0,
      reasoning: "Không thể phân tích AI. Vui lòng chọn thủ công.",
    }));
  }
}

// =============================================================================
// ENHANCED AUTO-MAPPING WITH AI FALLBACK
// =============================================================================

/**
 * Enhanced auto-mapping that uses AI for unmatched columns
 * First tries keyword matching, then uses AI for remaining columns
 */
export async function aiEnhancedAutoMapping(
  sourceColumns: string[],
  entityType: string,
  sampleData: Record<string, unknown>[],
  options: AIMapperOptions = {}
): Promise<{
  mappings: { sourceColumn: string; targetField: string; confidence: number; isAISuggested: boolean }[];
  unmappedColumns: string[];
  aiSuggestions: AIColumnSuggestion[];
}> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const fields = entityFieldDefinitions[entityType] || [];

  // First pass: keyword-based matching (existing logic)
  const keywordMappings: { sourceColumn: string; targetField: string; confidence: number; isAISuggested: boolean }[] = [];
  const unmatchedByKeyword: string[] = [];

  for (const column of sourceColumns) {
    const match = findFieldByKeyword(column, fields);

    if (match) {
      keywordMappings.push({
        sourceColumn: column,
        targetField: match.field.key,
        confidence: match.confidence,
        isAISuggested: false,
      });
    } else {
      unmatchedByKeyword.push(column);
    }
  }

  // Second pass: AI for unmatched columns (only if there are unmatched columns)
  let aiSuggestions: AIColumnSuggestion[] = [];

  if (unmatchedByKeyword.length > 0) {
    aiSuggestions = await aiSuggestMappings(unmatchedByKeyword, entityType, sampleData, options);

    // Add high-confidence AI suggestions to mappings
    for (const suggestion of aiSuggestions) {
      if (
        suggestion.suggestedField &&
        suggestion.confidence >= (opts.confidenceThreshold || 0.7)
      ) {
        // Check if target field is not already mapped
        const alreadyMapped = keywordMappings.some(
          (m) => m.targetField === suggestion.suggestedField
        );

        if (!alreadyMapped) {
          keywordMappings.push({
            sourceColumn: suggestion.sourceColumn,
            targetField: suggestion.suggestedField,
            confidence: suggestion.confidence,
            isAISuggested: true,
          });
        }
      }
    }
  }

  // Determine final unmapped columns
  const mappedColumns = new Set(keywordMappings.map((m) => m.sourceColumn));
  const unmappedColumns = sourceColumns.filter((col) => !mappedColumns.has(col));

  return {
    mappings: keywordMappings,
    unmappedColumns,
    aiSuggestions,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Normalize header for keyword matching
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Find matching field using keyword/alias matching
 * Returns field with confidence score
 */
function findFieldByKeyword(
  column: string,
  fields: FieldDefinition[]
): { field: FieldDefinition; confidence: number } | null {
  const normalizedColumn = normalizeHeader(column);

  // Exact key match - high confidence
  for (const field of fields) {
    if (normalizeHeader(field.key) === normalizedColumn) {
      return { field, confidence: 1.0 };
    }
  }

  // Exact label match - high confidence
  for (const field of fields) {
    if (normalizeHeader(field.label) === normalizedColumn) {
      return { field, confidence: 0.95 };
    }
  }

  // Alias match - medium-high confidence
  for (const field of fields) {
    if (field.aliases?.some((alias) => normalizeHeader(alias) === normalizedColumn)) {
      return { field, confidence: 0.9 };
    }
  }

  // Partial match (contains) - lower confidence
  for (const field of fields) {
    const fieldNorm = normalizeHeader(field.key);
    if (normalizedColumn.includes(fieldNorm) || fieldNorm.includes(normalizedColumn)) {
      return { field, confidence: 0.7 };
    }
  }

  // Partial alias match - lower confidence
  for (const field of fields) {
    if (field.aliases?.some((alias) => {
      const aliasNorm = normalizeHeader(alias);
      return normalizedColumn.includes(aliasNorm) || aliasNorm.includes(normalizedColumn);
    })) {
      return { field, confidence: 0.6 };
    }
  }

  return null;
}

/**
 * Check if AI should be used based on mapping confidence
 */
export function shouldUseAI(
  mappingResult: { unmappedColumns?: string[]; mappings?: { confidence?: number }[] },
  threshold: number = 0.7
): boolean {
  // Use AI if there are unmapped columns
  if (mappingResult.unmappedColumns && mappingResult.unmappedColumns.length > 0) {
    return true;
  }

  // Use AI if any mapping has low confidence
  if (mappingResult.mappings) {
    const lowConfidenceMappings = mappingResult.mappings.filter(
      (m) => (m.confidence || 0) < threshold
    );
    if (lowConfidenceMappings.length > 0) {
      return true;
    }
  }

  return false;
}
