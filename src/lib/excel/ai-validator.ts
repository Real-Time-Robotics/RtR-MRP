// src/lib/excel/ai-validator.ts
// AI-Powered Data Validation and Issue Detection

import { getAIProvider } from "@/lib/ai/provider";
import { ColumnMapping, entityFieldDefinitions } from "./mapper";
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface DataIssue {
  row: number; // Excel row number (1-indexed, including header)
  column: string;
  value: unknown;
  issue: string;
  suggestion: string;
  severity: "error" | "warning" | "info";
  category: DataIssueCategory;
}

export type DataIssueCategory =
  | "encoding"
  | "format"
  | "range"
  | "type_mismatch"
  | "duplicate"
  | "empty"
  | "suspicious"
  | "pattern";

export interface DataIssuesSummary {
  totalIssues: number;
  errors: number;
  warnings: number;
  info: number;
  byCategory: Record<DataIssueCategory, number>;
  affectedRows: number;
}

export interface AIValidationResult {
  issues: DataIssue[];
  summary: DataIssuesSummary;
  suggestions: AISuggestion[];
}

export interface AISuggestion {
  type: "column_rename" | "data_transform" | "bulk_fix";
  description: string;
  affectedRows: number;
  action?: string; // Suggested action or transformation
}

export interface AIValidatorOptions {
  maxRowsToAnalyze?: number;
  useAIForComplexIssues?: boolean;
  checkEncodingIssues?: boolean;
  checkFormatConsistency?: boolean;
  checkSuspiciousValues?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_OPTIONS: AIValidatorOptions = {
  maxRowsToAnalyze: 100,
  useAIForComplexIssues: true,
  checkEncodingIssues: true,
  checkFormatConsistency: true,
  checkSuspiciousValues: true,
};

// Patterns for detecting issues
const ENCODING_ISSUE_PATTERN = /[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F]/;
const SUSPICIOUS_NEGATIVE_FIELDS = ["unitCost", "basePrice", "quantity", "creditLimit"];
const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/, // ISO: 2024-01-15
  /^\d{2}\/\d{2}\/\d{4}$/, // US: 01/15/2024
  /^\d{2}-\d{2}-\d{4}$/, // EU: 15-01-2024
  /^\d{2}\/\d{2}\/\d{2}$/, // Short: 01/15/24
];

// =============================================================================
// MAIN VALIDATION FUNCTION
// =============================================================================

/**
 * Detect data issues using rule-based and AI-powered analysis
 */
export async function aiDetectDataIssues(
  data: Record<string, unknown>[],
  entityType: string,
  mappings: ColumnMapping[],
  options: AIValidatorOptions = {}
): Promise<AIValidationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const issues: DataIssue[] = [];
  const fields = entityFieldDefinitions[entityType] || [];

  // Create field lookup map
  const fieldMap = new Map(fields.map((f) => [f.key, f]));
  const mappingMap = new Map(mappings.map((m) => [m.sourceColumn, m]));

  // Limit rows to analyze for performance
  const rowsToAnalyze = data.slice(0, opts.maxRowsToAnalyze);

  // ==========================================================================
  // RULE-BASED DETECTION (Fast)
  // ==========================================================================

  for (let i = 0; i < rowsToAnalyze.length; i++) {
    const row = rowsToAnalyze[i];
    const excelRow = i + 2; // Excel is 1-indexed and has header row

    for (const mapping of mappings) {
      const value = row[mapping.sourceColumn];
      const field = fieldMap.get(mapping.targetField);

      if (!field) continue;

      // 1. Check encoding issues (common with Vietnamese Excel files)
      if (opts.checkEncodingIssues && typeof value === "string") {
        if (ENCODING_ISSUE_PATTERN.test(value)) {
          issues.push({
            row: excelRow,
            column: mapping.sourceColumn,
            value,
            issue: "Lỗi mã hóa ký tự - có thể có ký tự bị hỏng",
            suggestion: "Kiểm tra file gốc hoặc lưu lại dưới dạng UTF-8",
            severity: "warning",
            category: "encoding",
          });
        }
      }

      // 2. Check for empty required fields
      if (field.required && (value === null || value === undefined || value === "")) {
        issues.push({
          row: excelRow,
          column: mapping.sourceColumn,
          value,
          issue: `Trường bắt buộc "${field.label}" bị trống`,
          suggestion: `Vui lòng nhập giá trị cho ${field.label}`,
          severity: "error",
          category: "empty",
        });
      }

      // 3. Check type mismatches
      if (value !== null && value !== undefined && value !== "") {
        const typeIssue = checkTypeMismatch(value, field.type);
        if (typeIssue) {
          issues.push({
            row: excelRow,
            column: mapping.sourceColumn,
            value,
            issue: typeIssue.issue,
            suggestion: typeIssue.suggestion,
            severity: "warning",
            category: "type_mismatch",
          });
        }
      }

      // 4. Check suspicious values (negative prices, future dates, etc.)
      if (opts.checkSuspiciousValues) {
        const suspiciousIssue = checkSuspiciousValue(value, field.key, field.type);
        if (suspiciousIssue) {
          issues.push({
            row: excelRow,
            column: mapping.sourceColumn,
            value,
            ...suspiciousIssue,
            category: "suspicious",
          });
        }
      }
    }
  }

  // 5. Check format consistency within columns
  if (opts.checkFormatConsistency) {
    const formatIssues = checkFormatConsistency(rowsToAnalyze, mappings);
    issues.push(...formatIssues);
  }

  // ==========================================================================
  // AI-POWERED DETECTION (For complex patterns - optional)
  // ==========================================================================

  let aiSuggestions: AISuggestion[] = [];

  if (opts.useAIForComplexIssues && issues.length > 0) {
    try {
      aiSuggestions = await getAISuggestions(issues, data.slice(0, 10), entityType);
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'ai-validator', operation: 'getAISuggestions' });
      // Continue without AI suggestions
    }
  }

  // ==========================================================================
  // BUILD SUMMARY
  // ==========================================================================

  const summary = buildSummary(issues);

  return {
    issues,
    summary,
    suggestions: aiSuggestions,
  };
}

// =============================================================================
// RULE-BASED DETECTION HELPERS
// =============================================================================

/**
 * Check for type mismatches
 */
function checkTypeMismatch(
  value: unknown,
  expectedType: string
): { issue: string; suggestion: string } | null {
  const strValue = String(value).trim();

  switch (expectedType) {
    case "number":
    case "integer": {
      // Allow numeric strings
      if (typeof value === "number") return null;
      const num = parseFloat(strValue.replace(/[,\s]/g, ""));
      if (isNaN(num)) {
        return {
          issue: `Giá trị "${strValue}" không phải là số hợp lệ`,
          suggestion: "Chỉ nhập số, có thể có dấu thập phân",
        };
      }
      if (expectedType === "integer" && !Number.isInteger(num)) {
        return {
          issue: `Giá trị "${value}" không phải là số nguyên`,
          suggestion: "Cần nhập số nguyên, không có phần thập phân",
        };
      }
      return null;
    }

    case "date": {
      if (value instanceof Date) return null;
      const isValidDate = DATE_PATTERNS.some((p) => p.test(strValue)) ||
        !isNaN(Date.parse(strValue));
      if (!isValidDate) {
        return {
          issue: `Giá trị "${strValue}" không phải định dạng ngày hợp lệ`,
          suggestion: "Sử dụng định dạng: YYYY-MM-DD hoặc DD/MM/YYYY",
        };
      }
      return null;
    }

    case "boolean": {
      const boolValues = ["true", "false", "yes", "no", "1", "0", "có", "không"];
      if (!boolValues.includes(strValue.toLowerCase())) {
        return {
          issue: `Giá trị "${strValue}" không phải boolean hợp lệ`,
          suggestion: "Sử dụng: true/false, yes/no, 1/0, có/không",
        };
      }
      return null;
    }

    default:
      return null;
  }
}

/**
 * Check for suspicious values
 */
function checkSuspiciousValue(
  value: unknown,
  fieldKey: string,
  fieldType: string
): { issue: string; suggestion: string; severity: "warning" | "info" } | null {
  // Check negative values for fields that shouldn't be negative
  if (
    fieldType === "number" &&
    SUSPICIOUS_NEGATIVE_FIELDS.includes(fieldKey)
  ) {
    const num = typeof value === "number" ? value : parseFloat(String(value));
    if (!isNaN(num) && num < 0) {
      return {
        issue: `Giá trị âm (${num}) cho trường thường dương`,
        suggestion: "Kiểm tra lại giá trị - có thể nhập nhầm dấu",
        severity: "warning",
      };
    }
  }

  // Check for very large numbers (potential data entry errors)
  if (fieldType === "number" || fieldType === "integer") {
    const num = typeof value === "number" ? value : parseFloat(String(value));
    if (!isNaN(num) && Math.abs(num) > 1e12) {
      return {
        issue: `Giá trị rất lớn (${num}) - có thể là lỗi nhập liệu`,
        suggestion: "Kiểm tra lại giá trị",
        severity: "info",
      };
    }
  }

  // Check for future dates in certain contexts
  if (fieldType === "date" && fieldKey.includes("expiry")) {
    const date = value instanceof Date ? value : new Date(String(value));
    const fiveYearsFromNow = new Date();
    fiveYearsFromNow.setFullYear(fiveYearsFromNow.getFullYear() + 5);

    if (!isNaN(date.getTime()) && date > fiveYearsFromNow) {
      return {
        issue: `Ngày hết hạn xa trong tương lai (${date.toISOString().split("T")[0]})`,
        suggestion: "Kiểm tra lại ngày hết hạn",
        severity: "info",
      };
    }
  }

  return null;
}

/**
 * Check format consistency across a column
 */
function checkFormatConsistency(
  data: Record<string, unknown>[],
  mappings: ColumnMapping[]
): DataIssue[] {
  const issues: DataIssue[] = [];

  for (const mapping of mappings) {
    const values = data
      .map((row, index) => ({ value: row[mapping.sourceColumn], index }))
      .filter((v) => v.value !== null && v.value !== undefined && v.value !== "");

    if (values.length < 2) continue;

    // Check for mixed formats in potential date columns
    if (mapping.sourceColumn.toLowerCase().includes("date") ||
        mapping.sourceColumn.toLowerCase().includes("ngay")) {
      const formats = new Set<string>();

      for (const { value } of values) {
        const strValue = String(value);
        for (let i = 0; i < DATE_PATTERNS.length; i++) {
          if (DATE_PATTERNS[i].test(strValue)) {
            formats.add(`format_${i}`);
            break;
          }
        }
      }

      if (formats.size > 1) {
        issues.push({
          row: 0, // Column-level issue
          column: mapping.sourceColumn,
          value: null,
          issue: "Định dạng ngày không nhất quán trong cột",
          suggestion: "Thống nhất định dạng ngày cho toàn bộ cột (khuyến nghị: YYYY-MM-DD)",
          severity: "warning",
          category: "format",
        });
      }
    }

    // Check for mixed case in code/ID columns
    if (
      mapping.targetField?.toLowerCase().includes("code") ||
      mapping.targetField?.toLowerCase().includes("number")
    ) {
      const hasUpperCase = values.some(
        (v) => String(v.value) !== String(v.value).toLowerCase()
      );
      const hasLowerCase = values.some(
        (v) => String(v.value) !== String(v.value).toUpperCase()
      );

      if (hasUpperCase && hasLowerCase) {
        issues.push({
          row: 0,
          column: mapping.sourceColumn,
          value: null,
          issue: "Cột mã có cả chữ hoa và chữ thường",
          suggestion: "Cân nhắc thống nhất chữ hoa/thường cho cột mã",
          severity: "info",
          category: "format",
        });
      }
    }
  }

  return issues;
}

// =============================================================================
// AI SUGGESTION GENERATION
// =============================================================================

/**
 * Get AI-powered suggestions for fixing issues
 */
async function getAISuggestions(
  issues: DataIssue[],
  sampleData: Record<string, unknown>[],
  entityType: string
): Promise<AISuggestion[]> {
  const ai = getAIProvider();

  // Group issues by category
  const issuesByCategory = issues.reduce(
    (acc, issue) => {
      acc[issue.category] = (acc[issue.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const prompt = `Analyze these data quality issues from an Excel import for ${entityType}:

Issue summary by category:
${Object.entries(issuesByCategory)
  .map(([cat, count]) => `- ${cat}: ${count} issues`)
  .join("\n")}

Sample issues:
${issues
  .slice(0, 5)
  .map((i) => `- Row ${i.row}, Column "${i.column}": ${i.issue}`)
  .join("\n")}

Sample data:
${JSON.stringify(sampleData.slice(0, 3), null, 2)}

Provide 1-3 actionable suggestions to fix these issues efficiently.

Respond ONLY in valid JSON array format (no markdown):
[
  {
    "type": "column_rename|data_transform|bulk_fix",
    "description": "Brief description in Vietnamese",
    "affectedRows": estimated_number,
    "action": "Suggested action to take"
  }
]`;

  try {
    const response = await ai.chat({
      messages: [
        {
          role: "system",
          content:
            "You are a data quality expert. Provide practical suggestions for fixing data issues. Respond in Vietnamese. Use only valid JSON without markdown.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      maxTokens: 400,
    });

    // Clean response
    let content = response.content.trim();
    if (content.startsWith("```")) {
      content = content.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    }

    return JSON.parse(content);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'ai-validator', operation: 'aiSuggestions' });
    return [];
  }
}

// =============================================================================
// SUMMARY HELPERS
// =============================================================================

/**
 * Build summary from issues
 */
function buildSummary(issues: DataIssue[]): DataIssuesSummary {
  const byCategory: Record<DataIssueCategory, number> = {
    encoding: 0,
    format: 0,
    range: 0,
    type_mismatch: 0,
    duplicate: 0,
    empty: 0,
    suspicious: 0,
    pattern: 0,
  };

  let errors = 0;
  let warnings = 0;
  let info = 0;
  const affectedRowSet = new Set<number>();

  for (const issue of issues) {
    byCategory[issue.category]++;
    if (issue.row > 0) affectedRowSet.add(issue.row);

    switch (issue.severity) {
      case "error":
        errors++;
        break;
      case "warning":
        warnings++;
        break;
      case "info":
        info++;
        break;
    }
  }

  return {
    totalIssues: issues.length,
    errors,
    warnings,
    info,
    byCategory,
    affectedRows: affectedRowSet.size,
  };
}

// =============================================================================
// QUICK VALIDATION (NO AI)
// =============================================================================

/**
 * Quick rule-based validation without AI
 * Use for real-time validation during import
 */
export function quickValidateData(
  data: Record<string, unknown>[],
  entityType: string,
  mappings: ColumnMapping[]
): DataIssue[] {
  const issues: DataIssue[] = [];
  const fields = entityFieldDefinitions[entityType] || [];
  const fieldMap = new Map(fields.map((f) => [f.key, f]));

  // Only check first 50 rows for quick validation
  const rowsToCheck = data.slice(0, 50);

  for (let i = 0; i < rowsToCheck.length; i++) {
    const row = rowsToCheck[i];
    const excelRow = i + 2;

    for (const mapping of mappings) {
      const value = row[mapping.sourceColumn];
      const field = fieldMap.get(mapping.targetField);

      if (!field) continue;

      // Check required fields
      if (field.required && (value === null || value === undefined || value === "")) {
        issues.push({
          row: excelRow,
          column: mapping.sourceColumn,
          value,
          issue: `Trường bắt buộc "${field.label}" bị trống`,
          suggestion: `Nhập giá trị cho ${field.label}`,
          severity: "error",
          category: "empty",
        });
      }
    }
  }

  return issues;
}
