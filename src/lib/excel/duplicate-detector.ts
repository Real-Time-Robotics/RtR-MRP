// src/lib/excel/duplicate-detector.ts
// Duplicate Detection for Excel Import

import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/lib/ai/provider";
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface DuplicateMatch {
  importRow: number; // Row number in import data (1-indexed with header)
  importValue: string; // The identifier value from import
  existingRecord: {
    id: string;
    identifier: string;
    name?: string;
    additionalInfo?: Record<string, unknown>;
  };
  matchType: "exact" | "similar" | "potential";
  similarity?: number; // 0-1 for similar matches
  suggestion?: DuplicateResolution;
}

export type DuplicateResolution = "skip" | "update" | "create_new" | "merge";

export interface DuplicateCheckResult {
  duplicates: DuplicateMatch[];
  newRecords: number;
  summary: {
    total: number;
    exactDuplicates: number;
    similarMatches: number;
    newRecords: number;
  };
}

export interface DuplicateCheckOptions {
  checkSimilar?: boolean; // Also check for similar (fuzzy) matches
  similarityThreshold?: number; // 0-1, default 0.8
  maxSimilarResults?: number; // Max similar results per record
  batchSize?: number; // Database lookup batch size
}

export interface AIDuplicateResolution {
  importRow: number;
  importData: Record<string, unknown>;
  existingData: Record<string, unknown>;
  suggestedAction: DuplicateResolution;
  reasoning: string;
  confidence: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_OPTIONS: DuplicateCheckOptions = {
  checkSimilar: false,
  similarityThreshold: 0.8,
  maxSimilarResults: 3,
  batchSize: 100,
};

// Entity identifier field mapping
const ENTITY_IDENTIFIERS: Record<string, { field: string; dbField: string }> = {
  parts: { field: "partNumber", dbField: "partNumber" },
  suppliers: { field: "code", dbField: "code" },
  products: { field: "sku", dbField: "sku" },
  customers: { field: "code", dbField: "code" },
  inventory: { field: "partNumber", dbField: "partNumber" }, // Combined with warehouse
};

// =============================================================================
// MAIN DUPLICATE CHECK FUNCTION
// =============================================================================

/**
 * Check for duplicate records in the database
 */
export async function checkDuplicates(
  data: Record<string, unknown>[],
  entityType: string,
  identifierColumn: string,
  options: DuplicateCheckOptions = {}
): Promise<DuplicateCheckResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Extract identifiers from import data
  const identifiers = data
    .map((row, index) => ({
      index,
      value: String(row[identifierColumn] || "").trim(),
      row,
    }))
    .filter((r) => r.value !== "");

  if (identifiers.length === 0) {
    return {
      duplicates: [],
      newRecords: data.length,
      summary: {
        total: data.length,
        exactDuplicates: 0,
        similarMatches: 0,
        newRecords: data.length,
      },
    };
  }

  // Batch lookup existing records
  const existingRecords = await lookupExistingRecords(
    entityType,
    identifiers.map((i) => i.value),
    opts.batchSize || 100
  );

  // Create lookup map for fast matching
  const existingMap = new Map(
    existingRecords.map((r) => [r.identifier.toLowerCase(), r])
  );

  const duplicates: DuplicateMatch[] = [];
  const matchedImportIndices = new Set<number>();

  // Check for exact matches
  for (const { index, value, row } of identifiers) {
    const match = existingMap.get(value.toLowerCase());

    if (match) {
      duplicates.push({
        importRow: index + 2, // Excel row (1-indexed + header)
        importValue: value,
        existingRecord: match,
        matchType: "exact",
        suggestion: suggestResolution(row, match, entityType),
      });
      matchedImportIndices.add(index);
    }
  }

  // Check for similar matches if enabled
  if (opts.checkSimilar) {
    const unmatchedIdentifiers = identifiers.filter(
      (i) => !matchedImportIndices.has(i.index)
    );

    for (const { index, value, row } of unmatchedIdentifiers) {
      const similarMatches = findSimilarRecords(
        value,
        existingRecords,
        opts.similarityThreshold || 0.8,
        opts.maxSimilarResults || 3
      );

      for (const similarMatch of similarMatches) {
        duplicates.push({
          importRow: index + 2,
          importValue: value,
          existingRecord: similarMatch.record,
          matchType: "similar",
          similarity: similarMatch.similarity,
          suggestion: "create_new", // Default for similar matches
        });
      }

      if (similarMatches.length > 0) {
        matchedImportIndices.add(index);
      }
    }
  }

  const exactDuplicates = duplicates.filter((d) => d.matchType === "exact").length;
  const similarMatches = duplicates.filter((d) => d.matchType === "similar").length;

  return {
    duplicates,
    newRecords: identifiers.length - matchedImportIndices.size,
    summary: {
      total: data.length,
      exactDuplicates,
      similarMatches,
      newRecords: identifiers.length - matchedImportIndices.size,
    },
  };
}

// =============================================================================
// DATABASE LOOKUP FUNCTIONS
// =============================================================================

/**
 * Lookup existing records in database
 */
async function lookupExistingRecords(
  entityType: string,
  identifiers: string[],
  batchSize: number
): Promise<{ id: string; identifier: string; name?: string; additionalInfo?: Record<string, unknown> }[]> {
  if (identifiers.length === 0) return [];

  // Process in batches to avoid query limits
  const results: { id: string; identifier: string; name?: string; additionalInfo?: Record<string, unknown> }[] = [];

  for (let i = 0; i < identifiers.length; i += batchSize) {
    const batch = identifiers.slice(i, i + batchSize);
    const batchResults = await lookupBatch(entityType, batch);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Lookup a batch of records
 */
async function lookupBatch(
  entityType: string,
  identifiers: string[]
): Promise<{ id: string; identifier: string; name?: string; additionalInfo?: Record<string, unknown> }[]> {
  try {
    switch (entityType) {
      case "parts":
        return prisma.part
          .findMany({
            where: { partNumber: { in: identifiers, mode: "insensitive" } },
            select: {
              id: true,
              partNumber: true,
              name: true,
              category: true,
              unitCost: true,
              status: true,
            },
          })
          .then((rows) =>
            rows.map((r) => ({
              id: r.id,
              identifier: r.partNumber,
              name: r.name,
              additionalInfo: {
                category: r.category,
                unitCost: r.unitCost,
                status: r.status,
              },
            }))
          );

      case "suppliers":
        return prisma.supplier
          .findMany({
            where: { code: { in: identifiers, mode: "insensitive" } },
            select: {
              id: true,
              code: true,
              name: true,
              country: true,
              status: true,
            },
          })
          .then((rows) =>
            rows.map((r) => ({
              id: r.id,
              identifier: r.code,
              name: r.name,
              additionalInfo: {
                country: r.country,
                status: r.status,
              },
            }))
          );

      case "products":
        return prisma.product
          .findMany({
            where: { sku: { in: identifiers, mode: "insensitive" } },
            select: {
              id: true,
              sku: true,
              name: true,
              basePrice: true,
              status: true,
            },
          })
          .then((rows) =>
            rows.map((r) => ({
              id: r.id,
              identifier: r.sku,
              name: r.name,
              additionalInfo: {
                basePrice: r.basePrice,
                status: r.status,
              },
            }))
          );

      case "customers":
        return prisma.customer
          .findMany({
            where: { code: { in: identifiers, mode: "insensitive" } },
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
              status: true,
            },
          })
          .then((rows) =>
            rows.map((r) => ({
              id: r.id,
              identifier: r.code,
              name: r.name,
              additionalInfo: {
                type: r.type,
                status: r.status,
              },
            }))
          );

      case "inventory":
        // Inventory lookup - find parts with inventory records
        return prisma.inventory
          .findMany({
            where: {
              part: { partNumber: { in: identifiers, mode: "insensitive" } },
            },
            select: {
              id: true,
              part: { select: { partNumber: true, name: true } },
              warehouse: { select: { code: true } },
              quantity: true,
            },
            distinct: ["partId"],
          })
          .then((rows: Array<{
            id: string;
            part: { partNumber: string; name: string };
            warehouse: { code: string } | null;
            quantity: number;
          }>) =>
            rows.map((r) => ({
              id: r.id,
              identifier: r.part.partNumber,
              name: r.part.name,
              additionalInfo: {
                warehouse: r.warehouse?.code,
                quantity: r.quantity,
              },
            }))
          );

      default:
        return [];
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'duplicate-detector', operation: 'databaseLookup', entityType });
    return [];
  }
}

// =============================================================================
// SIMILARITY MATCHING
// =============================================================================

/**
 * Find similar records using string similarity
 */
function findSimilarRecords(
  value: string,
  existingRecords: { id: string; identifier: string; name?: string }[],
  threshold: number,
  maxResults: number
): { record: { id: string; identifier: string; name?: string }; similarity: number }[] {
  const matches: { record: { id: string; identifier: string; name?: string }; similarity: number }[] = [];

  for (const record of existingRecords) {
    const similarity = calculateSimilarity(
      value.toLowerCase(),
      record.identifier.toLowerCase()
    );

    if (similarity >= threshold) {
      matches.push({ record, similarity });
    }
  }

  // Sort by similarity (descending) and limit results
  return matches
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults);
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;

  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= str1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str2.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[str1.length][str2.length];
  const maxLength = Math.max(str1.length, str2.length);

  return 1 - distance / maxLength;
}

// =============================================================================
// RESOLUTION SUGGESTIONS
// =============================================================================

/**
 * Suggest resolution for a duplicate
 */
function suggestResolution(
  importRow: Record<string, unknown>,
  existingRecord: { id: string; identifier: string; name?: string; additionalInfo?: Record<string, unknown> },
  entityType: string
): DuplicateResolution {
  // Simple heuristics for suggestion
  // More complex logic could compare field values

  const existing = existingRecord.additionalInfo || {};

  // If existing record is inactive/obsolete, suggest update
  if (existing.status === "inactive" || existing.status === "obsolete") {
    return "update";
  }

  // If import has more data (non-null fields), suggest update
  const importFieldCount = Object.values(importRow).filter(
    (v) => v !== null && v !== undefined && v !== ""
  ).length;

  const existingFieldCount = Object.values(existing).filter(
    (v) => v !== null && v !== undefined && v !== ""
  ).length;

  if (importFieldCount > existingFieldCount + 2) {
    return "update";
  }

  // Default: skip duplicates
  return "skip";
}

// =============================================================================
// AI-POWERED RESOLUTION
// =============================================================================

/**
 * Get AI suggestions for duplicate resolution
 */
export async function aiSuggestDuplicateResolution(
  duplicates: DuplicateMatch[],
  importData: Record<string, unknown>[],
  entityType: string
): Promise<AIDuplicateResolution[]> {
  if (duplicates.length === 0) return [];

  const ai = getAIProvider();

  // Prepare data for AI analysis (limit to first 5 duplicates)
  const duplicatesToAnalyze = duplicates.slice(0, 5);
  const analysisData = duplicatesToAnalyze.map((dup) => {
    const importRow = importData[dup.importRow - 2]; // Convert back to 0-indexed
    return {
      importRow: dup.importRow,
      importValue: dup.importValue,
      importData: importRow,
      existingRecord: dup.existingRecord,
      matchType: dup.matchType,
    };
  });

  const prompt = `Analyze these duplicate records found during import and suggest the best action for each:

Entity type: ${entityType}

Duplicates to analyze:
${JSON.stringify(analysisData, null, 2)}

For each duplicate, suggest one of these actions:
- skip: Don't import, keep existing record
- update: Update existing record with import data
- create_new: Create new record (if identifier should be unique per context)
- merge: Combine data from both records

Consider:
1. Which record has more complete data?
2. Is the existing record active or inactive?
3. Are there significant value differences?

Respond ONLY in valid JSON array format (no markdown):
[
  {
    "importRow": row_number,
    "suggestedAction": "skip|update|create_new|merge",
    "reasoning": "Brief explanation in Vietnamese",
    "confidence": 0.0-1.0
  }
]`;

  try {
    const response = await ai.chat({
      messages: [
        {
          role: "system",
          content:
            "You are a data management expert. Analyze duplicate records and suggest the best resolution. Respond in Vietnamese. Use only valid JSON without markdown.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      maxTokens: 500,
    });

    // Clean response
    let content = response.content.trim();
    if (content.startsWith("```")) {
      content = content.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    }

    const results: AIDuplicateResolution[] = JSON.parse(content);

    // Merge with original data
    return results.map((result) => {
      const duplicate = duplicatesToAnalyze.find(
        (d) => d.importRow === result.importRow
      );
      return {
        importRow: result.importRow,
        importData: importData[result.importRow - 2] || {},
        existingData: duplicate?.existingRecord?.additionalInfo || {},
        suggestedAction: result.suggestedAction || "skip",
        reasoning: result.reasoning || "",
        confidence: Math.min(1, Math.max(0, result.confidence || 0.5)),
      };
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'duplicate-detector', operation: 'aiDuplicateResolution' });
    return [];
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get identifier field for entity type
 */
export function getIdentifierField(entityType: string): string | undefined {
  return ENTITY_IDENTIFIERS[entityType]?.field;
}

/**
 * Quick check if any duplicates exist (without full analysis)
 */
export async function hasAnyDuplicates(
  data: Record<string, unknown>[],
  entityType: string,
  identifierColumn: string
): Promise<boolean> {
  const identifiers = data
    .slice(0, 10) // Check first 10 rows only
    .map((row) => String(row[identifierColumn] || "").trim())
    .filter((v) => v !== "");

  if (identifiers.length === 0) return false;

  const existing = await lookupBatch(entityType, identifiers);
  return existing.length > 0;
}
