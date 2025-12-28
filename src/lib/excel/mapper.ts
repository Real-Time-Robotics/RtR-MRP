// src/lib/excel/mapper.ts
// Column Mapping and Data Transformation

import { normalizeBoolean, normalizeDate, normalizeNumber } from "./validator";

export interface FieldDefinition {
  key: string;
  label: string;
  type: "string" | "number" | "integer" | "boolean" | "date" | "enum";
  required: boolean;
  aliases?: string[]; // Alternative column names
  defaultValue?: unknown;
  enumValues?: string[];
  transform?: (value: unknown) => unknown;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  transform?: (value: unknown) => unknown;
}

export interface MappingConfig {
  mappings: ColumnMapping[];
  entityType: string;
  updateMode: "insert" | "update" | "upsert";
  identifierField?: string; // Field used to identify existing records for update/upsert
}

export interface MappingResult {
  success: boolean;
  data: Record<string, unknown>[];
  errors?: string[];
  unmappedColumns?: string[];
  missingRequiredFields?: string[];
}

// Default field definitions for entity types
export const entityFieldDefinitions: Record<string, FieldDefinition[]> = {
  parts: [
    { key: "partNumber", label: "Part Number", type: "string", required: true, aliases: ["part_number", "part", "pn", "item_number"] },
    { key: "name", label: "Name", type: "string", required: true, aliases: ["part_name", "item_name", "description_short"] },
    { key: "category", label: "Category", type: "string", required: false, aliases: ["part_category", "item_category", "type"] },
    { key: "description", label: "Description", type: "string", required: false, aliases: ["desc", "part_desc", "full_description"] },
    { key: "unit", label: "Unit", type: "string", required: false, aliases: ["uom", "unit_of_measure"], defaultValue: "pcs" },
    { key: "unitCost", label: "Unit Cost", type: "number", required: false, aliases: ["cost", "price", "unit_price", "standard_cost"] },
    { key: "weightKg", label: "Weight (kg)", type: "number", required: false, aliases: ["weight", "weight_kg", "net_weight"] },
    { key: "isCritical", label: "Critical", type: "boolean", required: false, aliases: ["critical", "is_critical"], defaultValue: false },
    { key: "minStockLevel", label: "Min Stock Level", type: "integer", required: false, aliases: ["min_stock", "minimum_qty"], defaultValue: 0 },
    { key: "reorderPoint", label: "Reorder Point", type: "integer", required: false, aliases: ["rop", "reorder_qty"], defaultValue: 0 },
    { key: "safetyStock", label: "Safety Stock", type: "integer", required: false, aliases: ["safety_qty", "buffer_stock"], defaultValue: 0 },
    { key: "shelfLifeDays", label: "Shelf Life (days)", type: "integer", required: false, aliases: ["shelf_life", "expiry_days"] },
    { key: "status", label: "Status", type: "enum", required: false, aliases: [], enumValues: ["active", "inactive", "obsolete"], defaultValue: "active" },
  ],
  suppliers: [
    { key: "code", label: "Code", type: "string", required: true, aliases: ["supplier_code", "vendor_code", "supplier_id"] },
    { key: "name", label: "Name", type: "string", required: true, aliases: ["supplier_name", "vendor_name", "company"] },
    { key: "country", label: "Country", type: "string", required: false, aliases: ["nation", "country_code"] },
    { key: "contactName", label: "Contact Name", type: "string", required: false, aliases: ["contact", "primary_contact", "rep"] },
    { key: "contactEmail", label: "Email", type: "string", required: false, aliases: ["email", "contact_email", "e_mail"] },
    { key: "contactPhone", label: "Phone", type: "string", required: false, aliases: ["phone", "telephone", "contact_phone"] },
    { key: "address", label: "Address", type: "string", required: false, aliases: ["full_address", "street_address", "location"] },
    { key: "paymentTerms", label: "Payment Terms", type: "string", required: false, aliases: ["terms", "payment"] },
    { key: "leadTimeDays", label: "Lead Time (days)", type: "integer", required: true, aliases: ["lead_time", "delivery_days", "lt"] },
    { key: "rating", label: "Rating", type: "number", required: false, aliases: ["score", "vendor_rating"] },
    { key: "category", label: "Category", type: "string", required: false, aliases: ["type", "supplier_type"] },
    { key: "ndaaCompliant", label: "NDAA Compliant", type: "boolean", required: false, aliases: ["ndaa", "compliant"], defaultValue: true },
    { key: "status", label: "Status", type: "enum", required: false, aliases: [], enumValues: ["active", "inactive", "blocked"], defaultValue: "active" },
  ],
  products: [
    { key: "sku", label: "SKU", type: "string", required: true, aliases: ["product_code", "item_sku", "product_number"] },
    { key: "name", label: "Name", type: "string", required: true, aliases: ["product_name", "item_name", "title"] },
    { key: "description", label: "Description", type: "string", required: false, aliases: ["desc", "product_desc"] },
    { key: "basePrice", label: "Base Price", type: "number", required: false, aliases: ["price", "list_price", "msrp"] },
    { key: "assemblyHours", label: "Assembly Hours", type: "number", required: false, aliases: ["assembly_time", "build_hours"] },
    { key: "testingHours", label: "Testing Hours", type: "number", required: false, aliases: ["test_time", "qa_hours"] },
    { key: "status", label: "Status", type: "enum", required: false, aliases: [], enumValues: ["active", "inactive", "development", "obsolete"], defaultValue: "active" },
  ],
  customers: [
    { key: "code", label: "Code", type: "string", required: true, aliases: ["customer_code", "cust_code", "account_number"] },
    { key: "name", label: "Name", type: "string", required: true, aliases: ["customer_name", "company_name", "account_name"] },
    { key: "type", label: "Type", type: "string", required: false, aliases: ["customer_type", "account_type"] },
    { key: "country", label: "Country", type: "string", required: false, aliases: ["nation", "country_code"] },
    { key: "contactName", label: "Contact Name", type: "string", required: false, aliases: ["contact", "primary_contact"] },
    { key: "contactEmail", label: "Email", type: "string", required: false, aliases: ["email", "contact_email"] },
    { key: "contactPhone", label: "Phone", type: "string", required: false, aliases: ["phone", "contact_phone"] },
    { key: "billingAddress", label: "Billing Address", type: "string", required: false, aliases: ["address", "bill_to"] },
    { key: "paymentTerms", label: "Payment Terms", type: "string", required: false, aliases: ["terms", "payment"] },
    { key: "creditLimit", label: "Credit Limit", type: "number", required: false, aliases: ["credit", "limit"] },
    { key: "status", label: "Status", type: "enum", required: false, aliases: [], enumValues: ["active", "inactive", "suspended"], defaultValue: "active" },
  ],
  inventory: [
    { key: "partNumber", label: "Part Number", type: "string", required: true, aliases: ["part", "pn", "item_number"] },
    { key: "warehouseCode", label: "Warehouse", type: "string", required: true, aliases: ["warehouse", "location", "wh_code"] },
    { key: "quantity", label: "Quantity", type: "integer", required: true, aliases: ["qty", "on_hand", "stock_qty"] },
    { key: "reservedQty", label: "Reserved Qty", type: "integer", required: false, aliases: ["reserved", "allocated"], defaultValue: 0 },
    { key: "lotNumber", label: "Lot Number", type: "string", required: false, aliases: ["lot", "batch", "batch_number"] },
    { key: "locationCode", label: "Location Code", type: "string", required: false, aliases: ["bin", "slot", "storage_location"] },
    { key: "expiryDate", label: "Expiry Date", type: "date", required: false, aliases: ["expiry", "exp_date", "best_before"] },
  ],
  bom: [
    { key: "productSku", label: "Product SKU", type: "string", required: true, aliases: ["product", "parent_sku", "assembly"] },
    { key: "partNumber", label: "Part Number", type: "string", required: true, aliases: ["component", "child_part", "part"] },
    { key: "quantity", label: "Quantity", type: "number", required: true, aliases: ["qty", "per_assembly"] },
    { key: "version", label: "Version", type: "string", required: false, aliases: ["bom_version", "rev"], defaultValue: "1.0" },
    { key: "level", label: "Level", type: "integer", required: false, aliases: ["bom_level", "indent"], defaultValue: 1 },
    { key: "moduleCode", label: "Module Code", type: "string", required: false, aliases: ["module", "subassembly"] },
    { key: "position", label: "Position", type: "string", required: false, aliases: ["ref_des", "designator"] },
    { key: "scrapRate", label: "Scrap Rate", type: "number", required: false, aliases: ["scrap", "waste_factor"], defaultValue: 0 },
    { key: "isCritical", label: "Critical", type: "boolean", required: false, aliases: ["critical"], defaultValue: false },
  ],
};

// Normalize column header for matching
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "")
    .replace(/\s+/g, "_");
}

// Find best matching field for a column
function findMatchingField(
  column: string,
  fields: FieldDefinition[]
): FieldDefinition | null {
  const normalizedColumn = normalizeHeader(column);

  // Exact key match
  for (const field of fields) {
    if (normalizeHeader(field.key) === normalizedColumn) {
      return field;
    }
  }

  // Exact label match
  for (const field of fields) {
    if (normalizeHeader(field.label) === normalizedColumn) {
      return field;
    }
  }

  // Alias match
  for (const field of fields) {
    if (field.aliases?.some((alias) => normalizeHeader(alias) === normalizedColumn)) {
      return field;
    }
  }

  // Partial match
  for (const field of fields) {
    const fieldNorm = normalizeHeader(field.key);
    if (normalizedColumn.includes(fieldNorm) || fieldNorm.includes(normalizedColumn)) {
      return field;
    }
  }

  return null;
}

// Auto-detect column mappings
export function autoDetectMappings(
  sourceColumns: string[],
  entityType: string
): {
  mappings: ColumnMapping[];
  unmappedColumns: string[];
  missingRequiredFields: string[];
} {
  const fields = entityFieldDefinitions[entityType] || [];
  const mappings: ColumnMapping[] = [];
  const unmappedColumns: string[] = [];
  const mappedFields = new Set<string>();

  for (const column of sourceColumns) {
    const matchedField = findMatchingField(column, fields);

    if (matchedField) {
      mappings.push({
        sourceColumn: column,
        targetField: matchedField.key,
        transform: createTransform(matchedField),
      });
      mappedFields.add(matchedField.key);
    } else {
      unmappedColumns.push(column);
    }
  }

  // Find missing required fields
  const missingRequiredFields = fields
    .filter((f) => f.required && !mappedFields.has(f.key))
    .map((f) => f.label);

  return { mappings, unmappedColumns, missingRequiredFields };
}

// Create transform function for a field
function createTransform(field: FieldDefinition): ((value: unknown) => unknown) | undefined {
  switch (field.type) {
    case "number":
      return (value) => normalizeNumber(value) ?? field.defaultValue ?? null;

    case "integer":
      return (value) => {
        const num = normalizeNumber(value);
        return num !== null ? Math.round(num) : field.defaultValue ?? null;
      };

    case "boolean":
      return (value) => normalizeBoolean(value) ?? field.defaultValue ?? null;

    case "date":
      return (value) => normalizeDate(value);

    case "enum":
      return (value) => {
        if (value === null || value === undefined || value === "") {
          return field.defaultValue ?? null;
        }
        const str = String(value).toLowerCase().trim();
        if (field.enumValues?.includes(str)) {
          return str;
        }
        return field.defaultValue ?? null;
      };

    case "string":
    default:
      return (value) => {
        if (value === null || value === undefined || value === "") {
          return field.defaultValue ?? null;
        }
        return String(value).trim();
      };
  }
}

// Apply mappings to transform data
export function applyMappings(
  data: Record<string, unknown>[],
  config: MappingConfig
): MappingResult {
  const fields = entityFieldDefinitions[config.entityType] || [];
  const result: Record<string, unknown>[] = [];
  const errors: string[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const mappedRow: Record<string, unknown> = {};

    for (const mapping of config.mappings) {
      const sourceValue = row[mapping.sourceColumn];
      const transformedValue = mapping.transform
        ? mapping.transform(sourceValue)
        : sourceValue;

      mappedRow[mapping.targetField] = transformedValue;
    }

    // Apply default values for missing fields
    for (const field of fields) {
      if (!(field.key in mappedRow) && field.defaultValue !== undefined) {
        mappedRow[field.key] = field.defaultValue;
      }
    }

    // Check for required fields
    const missingRequired = fields
      .filter(
        (f) =>
          f.required &&
          (mappedRow[f.key] === null ||
            mappedRow[f.key] === undefined ||
            mappedRow[f.key] === "")
      )
      .map((f) => f.label);

    if (missingRequired.length > 0) {
      errors.push(`Row ${i + 2}: Missing required fields: ${missingRequired.join(", ")}`);
    }

    result.push(mappedRow);
  }

  // Find unmapped source columns
  const mappedSourceColumns = new Set(config.mappings.map((m) => m.sourceColumn));
  const allSourceColumns = data.length > 0 ? Object.keys(data[0]) : [];
  const unmappedColumns = allSourceColumns.filter((col) => !mappedSourceColumns.has(col));

  // Find missing required target fields
  const mappedTargetFields = new Set(config.mappings.map((m) => m.targetField));
  const missingRequiredFields = fields
    .filter((f) => f.required && !mappedTargetFields.has(f.key))
    .map((f) => f.label);

  return {
    success: errors.length === 0,
    data: result,
    errors: errors.length > 0 ? errors : undefined,
    unmappedColumns: unmappedColumns.length > 0 ? unmappedColumns : undefined,
    missingRequiredFields:
      missingRequiredFields.length > 0 ? missingRequiredFields : undefined,
  };
}

// Get field definitions for an entity type
export function getFieldDefinitions(entityType: string): FieldDefinition[] {
  return entityFieldDefinitions[entityType] || [];
}

// Get required fields for an entity type
export function getRequiredFields(entityType: string): string[] {
  return (entityFieldDefinitions[entityType] || [])
    .filter((f) => f.required)
    .map((f) => f.key);
}

// Get identifier field for an entity type
export function getIdentifierField(entityType: string): string | undefined {
  const identifiers: Record<string, string> = {
    parts: "partNumber",
    suppliers: "code",
    products: "sku",
    customers: "code",
    inventory: "partNumber",
  };
  return identifiers[entityType];
}

// Create a mapping configuration
export function createMappingConfig(
  mappings: ColumnMapping[],
  entityType: string,
  updateMode: MappingConfig["updateMode"] = "insert"
): MappingConfig {
  return {
    mappings,
    entityType,
    updateMode,
    identifierField: getIdentifierField(entityType),
  };
}
