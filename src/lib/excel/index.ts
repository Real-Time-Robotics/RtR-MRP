// src/lib/excel/index.ts
// Excel Library Exports

// Parser exports
export {
  parseExcelBuffer,
  parseExcelBase64,
  parseCSVBuffer,
  parseFile,
  getSheetPreview,
  detectEntityType,
  type ParsedColumn,
  type ParsedSheet,
  type ParseResult,
} from "./parser";

// Exporter exports
export {
  exportToExcelBuffer,
  exportToCSVBuffer,
  exportToBase64,
  createExcelWorkbook,
  createMultiSheetWorkbook,
  generateImportTemplate,
  defaultColumnDefinitions,
  type ExportColumn,
  type ExportOptions,
  type ExportResult,
} from "./exporter";

// Validator exports
export {
  validateData,
  validateRow,
  getValidationRules,
  createValidationRules,
  normalizeBoolean,
  normalizeNumber,
  normalizeDate,
  defaultValidationRules,
  type FieldType,
  type FieldValidation,
  type ValidationRule,
  type ValidationError,
  type ValidationResult,
} from "./validator";

// Mapper exports
export {
  autoDetectMappings,
  applyMappings,
  getFieldDefinitions,
  getRequiredFields,
  getIdentifierField,
  createMappingConfig,
  entityFieldDefinitions,
  type FieldDefinition,
  type ColumnMapping,
  type MappingConfig,
  type MappingResult,
} from "./mapper";

// AI Mapper exports
export {
  aiDetectEntityType,
  aiSuggestMappings,
  aiEnhancedAutoMapping,
  shouldUseAI,
  type AIColumnSuggestion,
  type AIEntitySuggestion,
  type AIMapperOptions,
} from "./ai-mapper";

// AI Validator exports
export {
  aiDetectDataIssues,
  quickValidateData,
  type DataIssue,
  type DataIssueCategory,
  type DataIssuesSummary,
  type AIValidationResult,
  type AISuggestion,
  type AIValidatorOptions,
} from "./ai-validator";

// Duplicate Detector exports
export {
  checkDuplicates,
  aiSuggestDuplicateResolution,
  getIdentifierField as getDuplicateIdentifierField,
  hasAnyDuplicates,
  type DuplicateMatch,
  type DuplicateResolution,
  type DuplicateCheckResult,
  type DuplicateCheckOptions,
  type AIDuplicateResolution,
} from "./duplicate-detector";
