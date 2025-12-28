// src/lib/excel/validator.ts
// Excel Data Validator

export type FieldType = "string" | "number" | "integer" | "boolean" | "date" | "email" | "url" | "enum";

export interface FieldValidation {
  type: FieldType;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  enumValues?: string[];
  unique?: boolean;
  customValidator?: (value: unknown, row: Record<string, unknown>) => boolean | string;
}

export interface ValidationRule {
  field: string;
  validation: FieldValidation;
  errorMessage?: string;
}

export interface ValidationError {
  row: number;
  field: string;
  value: unknown;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  validRowCount: number;
  invalidRowCount: number;
  warningRowCount: number;
}

// Default validation rules for entity types
export const defaultValidationRules: Record<string, ValidationRule[]> = {
  parts: [
    {
      field: "partNumber",
      validation: { type: "string", required: true, minLength: 1, maxLength: 50, unique: true },
      errorMessage: "Part Number is required and must be unique",
    },
    {
      field: "name",
      validation: { type: "string", required: true, minLength: 1, maxLength: 200 },
      errorMessage: "Name is required",
    },
    {
      field: "category",
      validation: { type: "string", maxLength: 50 },
    },
    {
      field: "unit",
      validation: { type: "string", maxLength: 20 },
    },
    {
      field: "unitCost",
      validation: { type: "number", min: 0 },
      errorMessage: "Unit Cost must be a positive number",
    },
    {
      field: "weightKg",
      validation: { type: "number", min: 0 },
    },
    {
      field: "minStockLevel",
      validation: { type: "integer", min: 0 },
    },
    {
      field: "reorderPoint",
      validation: { type: "integer", min: 0 },
    },
    {
      field: "safetyStock",
      validation: { type: "integer", min: 0 },
    },
    {
      field: "status",
      validation: { type: "enum", enumValues: ["active", "inactive", "obsolete"] },
    },
  ],
  suppliers: [
    {
      field: "code",
      validation: { type: "string", required: true, minLength: 1, maxLength: 20, unique: true },
      errorMessage: "Supplier Code is required and must be unique",
    },
    {
      field: "name",
      validation: { type: "string", required: true, minLength: 1, maxLength: 200 },
      errorMessage: "Supplier Name is required",
    },
    {
      field: "country",
      validation: { type: "string", maxLength: 50 },
    },
    {
      field: "contactEmail",
      validation: { type: "email" },
      errorMessage: "Invalid email format",
    },
    {
      field: "leadTimeDays",
      validation: { type: "integer", min: 0, required: true },
      errorMessage: "Lead Time is required and must be a positive integer",
    },
    {
      field: "rating",
      validation: { type: "number", min: 0, max: 5 },
      errorMessage: "Rating must be between 0 and 5",
    },
    {
      field: "status",
      validation: { type: "enum", enumValues: ["active", "inactive", "blocked"] },
    },
  ],
  products: [
    {
      field: "sku",
      validation: { type: "string", required: true, minLength: 1, maxLength: 50, unique: true },
      errorMessage: "SKU is required and must be unique",
    },
    {
      field: "name",
      validation: { type: "string", required: true, minLength: 1, maxLength: 200 },
      errorMessage: "Product Name is required",
    },
    {
      field: "basePrice",
      validation: { type: "number", min: 0 },
    },
    {
      field: "assemblyHours",
      validation: { type: "number", min: 0 },
    },
    {
      field: "testingHours",
      validation: { type: "number", min: 0 },
    },
    {
      field: "status",
      validation: { type: "enum", enumValues: ["active", "inactive", "development", "obsolete"] },
    },
  ],
  customers: [
    {
      field: "code",
      validation: { type: "string", required: true, minLength: 1, maxLength: 20, unique: true },
      errorMessage: "Customer Code is required and must be unique",
    },
    {
      field: "name",
      validation: { type: "string", required: true, minLength: 1, maxLength: 200 },
      errorMessage: "Customer Name is required",
    },
    {
      field: "contactEmail",
      validation: { type: "email" },
      errorMessage: "Invalid email format",
    },
    {
      field: "creditLimit",
      validation: { type: "number", min: 0 },
    },
    {
      field: "status",
      validation: { type: "enum", enumValues: ["active", "inactive", "suspended"] },
    },
  ],
  inventory: [
    {
      field: "partNumber",
      validation: { type: "string", required: true },
      errorMessage: "Part Number is required",
    },
    {
      field: "warehouse",
      validation: { type: "string", required: true },
      errorMessage: "Warehouse is required",
    },
    {
      field: "quantity",
      validation: { type: "integer", min: 0, required: true },
      errorMessage: "Quantity is required and must be a positive integer",
    },
    {
      field: "lotNumber",
      validation: { type: "string", maxLength: 50 },
    },
  ],
};

// Validate a single value
function validateValue(
  value: unknown,
  validation: FieldValidation,
  row: Record<string, unknown>
): { valid: boolean; message?: string } {
  // Check required
  if (validation.required) {
    if (value === null || value === undefined || value === "") {
      return { valid: false, message: "Field is required" };
    }
  }

  // Skip validation for null/empty non-required fields
  if (value === null || value === undefined || value === "") {
    return { valid: true };
  }

  const strValue = String(value);

  switch (validation.type) {
    case "string":
      if (typeof value !== "string" && typeof value !== "number") {
        return { valid: false, message: "Must be a string" };
      }
      if (validation.minLength && strValue.length < validation.minLength) {
        return { valid: false, message: `Must be at least ${validation.minLength} characters` };
      }
      if (validation.maxLength && strValue.length > validation.maxLength) {
        return { valid: false, message: `Must be at most ${validation.maxLength} characters` };
      }
      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(strValue)) {
          return { valid: false, message: "Does not match required pattern" };
        }
      }
      break;

    case "number":
      const num = typeof value === "number" ? value : parseFloat(strValue);
      if (isNaN(num)) {
        return { valid: false, message: "Must be a valid number" };
      }
      if (validation.min !== undefined && num < validation.min) {
        return { valid: false, message: `Must be at least ${validation.min}` };
      }
      if (validation.max !== undefined && num > validation.max) {
        return { valid: false, message: `Must be at most ${validation.max}` };
      }
      break;

    case "integer":
      const int = typeof value === "number" ? value : parseInt(strValue, 10);
      if (isNaN(int) || !Number.isInteger(int)) {
        return { valid: false, message: "Must be a valid integer" };
      }
      if (validation.min !== undefined && int < validation.min) {
        return { valid: false, message: `Must be at least ${validation.min}` };
      }
      if (validation.max !== undefined && int > validation.max) {
        return { valid: false, message: `Must be at most ${validation.max}` };
      }
      break;

    case "boolean":
      const boolStr = strValue.toLowerCase();
      if (!["true", "false", "yes", "no", "1", "0"].includes(boolStr)) {
        return { valid: false, message: "Must be true/false or yes/no" };
      }
      break;

    case "date":
      const date = new Date(strValue);
      if (isNaN(date.getTime())) {
        return { valid: false, message: "Must be a valid date" };
      }
      break;

    case "email":
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(strValue)) {
        return { valid: false, message: "Must be a valid email address" };
      }
      break;

    case "url":
      try {
        new URL(strValue);
      } catch {
        return { valid: false, message: "Must be a valid URL" };
      }
      break;

    case "enum":
      if (validation.enumValues && !validation.enumValues.includes(strValue.toLowerCase())) {
        return {
          valid: false,
          message: `Must be one of: ${validation.enumValues.join(", ")}`,
        };
      }
      break;
  }

  // Custom validator
  if (validation.customValidator) {
    const result = validation.customValidator(value, row);
    if (result !== true) {
      return { valid: false, message: typeof result === "string" ? result : "Custom validation failed" };
    }
  }

  return { valid: true };
}

// Validate a single row
export function validateRow(
  row: Record<string, unknown>,
  rowNumber: number,
  rules: ValidationRule[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const rule of rules) {
    const value = row[rule.field];
    const result = validateValue(value, rule.validation, row);

    if (!result.valid) {
      errors.push({
        row: rowNumber,
        field: rule.field,
        value,
        message: rule.errorMessage || result.message || "Validation failed",
        severity: rule.validation.required ? "error" : "warning",
      });
    }
  }

  return errors;
}

// Validate entire dataset
export function validateData(
  data: Record<string, unknown>[],
  rules: ValidationRule[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const uniqueValues: Record<string, Set<string>> = {};

  // Initialize unique value tracking
  for (const rule of rules) {
    if (rule.validation.unique) {
      uniqueValues[rule.field] = new Set();
    }
  }

  const invalidRows = new Set<number>();
  const warningRows = new Set<number>();

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 2; // +2 because Excel rows start at 1 and we skip header

    // Validate each field
    for (const rule of rules) {
      const value = row[rule.field];
      const result = validateValue(value, rule.validation, row);

      if (!result.valid) {
        const error: ValidationError = {
          row: rowNumber,
          field: rule.field,
          value,
          message: rule.errorMessage || result.message || "Validation failed",
          severity: rule.validation.required ? "error" : "warning",
        };

        if (error.severity === "error") {
          errors.push(error);
          invalidRows.add(rowNumber);
        } else {
          warnings.push(error);
          warningRows.add(rowNumber);
        }
      }

      // Check uniqueness
      if (rule.validation.unique && value !== null && value !== undefined && value !== "") {
        const strValue = String(value).toLowerCase();
        if (uniqueValues[rule.field].has(strValue)) {
          errors.push({
            row: rowNumber,
            field: rule.field,
            value,
            message: `Duplicate value: "${value}" already exists`,
            severity: "error",
          });
          invalidRows.add(rowNumber);
        } else {
          uniqueValues[rule.field].add(strValue);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    validRowCount: data.length - invalidRows.size,
    invalidRowCount: invalidRows.size,
    warningRowCount: warningRows.size,
  };
}

// Get validation rules for entity type
export function getValidationRules(entityType: string): ValidationRule[] {
  return defaultValidationRules[entityType] || [];
}

// Create custom validation rules
export function createValidationRules(
  fieldDefinitions: {
    field: string;
    type: FieldType;
    required?: boolean;
    options?: Partial<FieldValidation>;
    errorMessage?: string;
  }[]
): ValidationRule[] {
  return fieldDefinitions.map((def) => ({
    field: def.field,
    validation: {
      type: def.type,
      required: def.required,
      ...def.options,
    },
    errorMessage: def.errorMessage,
  }));
}

// Validate and transform boolean values
export function normalizeBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "boolean") return value;

  const str = String(value).toLowerCase().trim();
  if (["true", "yes", "1", "y"].includes(str)) return true;
  if (["false", "no", "0", "n"].includes(str)) return false;

  return null;
}

// Validate and transform numeric values
export function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number" && !isNaN(value)) return value;

  const num = parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  return isNaN(num) ? null : num;
}

// Validate and transform date values
export function normalizeDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date && !isNaN(value.getTime())) return value;

  const date = new Date(String(value));
  return isNaN(date.getTime()) ? null : date;
}
