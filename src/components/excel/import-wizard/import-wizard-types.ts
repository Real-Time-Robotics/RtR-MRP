// src/components/excel/import-wizard/import-wizard-types.ts
// Shared types for the Import Wizard

export interface ImportStep {
  id: number;
  name: string;
  icon: React.ElementType;
}

export interface FieldDefinition {
  key: string;
  label: string;
  type: string;
  required: boolean;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
}

export interface ParseResult {
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

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ImportResult {
  processed: number;
  success: number;
  errors: { row: number; message: string }[];
}

export interface ImportWizardProps {
  onSuccess?: () => void;
  onClose?: () => void;
  defaultEntityType?: string;
}

export interface EntityType {
  value: string;
  label: string;
  description: string;
}

// Data Cleansing types
export interface CellEdit {
  rowIndex: number;
  columnKey: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface CleansingAction {
  type: 'trim_whitespace' | 'remove_empty_rows' | 'apply_fix' | 'fix_all';
  label: string;
}

export const ENTITY_TYPES: EntityType[] = [
  { value: "parts", label: "Linh kiện", description: "Import dữ liệu linh kiện / vật tư" },
  { value: "suppliers", label: "Nhà cung cấp", description: "Import thông tin nhà cung cấp" },
  { value: "products", label: "Sản phẩm", description: "Import danh mục sản phẩm" },
  { value: "customers", label: "Khách hàng", description: "Import dữ liệu khách hàng" },
  { value: "warehouses", label: "Kho hàng", description: "Import dữ liệu kho hàng" },
  { value: "inventory", label: "Tồn kho", description: "Import số liệu tồn kho" },
  { value: "bom", label: "BOM", description: "Import định mức vật tư (BOM)" },
  { value: "part-suppliers", label: "NCC-Vật tư", description: "Import quan hệ nhà cung cấp - vật tư" },
];
