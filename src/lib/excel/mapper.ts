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
// Includes both English and Vietnamese aliases for international support
export const entityFieldDefinitions: Record<string, FieldDefinition[]> = {
  parts: [
    {
      key: "partNumber",
      label: "Part Number",
      type: "string",
      required: true,
      aliases: [
        // English
        "part_number", "part", "pn", "item_number", "item_code", "part_no",
        // Vietnamese
        "ma_sp", "masp", "ma_san_pham", "masanpham", "ma_linh_kien", "malinhkien",
        "ma_vat_tu", "mavattu", "so_hieu", "ma_hang", "mahang", "ma_phan"
      ]
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      aliases: [
        "part_name", "item_name", "description_short", "product_name",
        // Vietnamese
        "ten", "ten_sp", "tensp", "ten_san_pham", "tensanpham", "ten_linh_kien",
        "tenlinhkien", "mo_ta", "ten_vat_tu", "tenvattu", "ten_hang"
      ]
    },
    {
      key: "category",
      label: "Category",
      type: "string",
      required: false,
      aliases: [
        "part_category", "item_category", "type", "group",
        // Vietnamese
        "danh_muc", "danhmuc", "loai", "nhom", "phan_loai", "phanloai"
      ]
    },
    {
      key: "description",
      label: "Description",
      type: "string",
      required: false,
      aliases: [
        "desc", "part_desc", "full_description", "remarks",
        // Vietnamese
        "mo_ta", "mota", "mo_ta_chi_tiet", "dien_giai", "ghi_chu", "ghichu"
      ]
    },
    {
      key: "unit",
      label: "Unit",
      type: "string",
      required: false,
      aliases: [
        "uom", "unit_of_measure", "measure_unit",
        // Vietnamese
        "don_vi", "donvi", "dvt", "don_vi_tinh", "donvitinh"
      ],
      defaultValue: "pcs"
    },
    {
      key: "unitCost",
      label: "Unit Cost",
      type: "number",
      required: false,
      aliases: [
        "cost", "price", "unit_price", "standard_cost", "item_cost",
        // Vietnamese
        "don_gia", "dongia", "gia", "gia_nhap", "gianhap", "gia_mua", "giamua",
        "chi_phi", "gia_von", "giavon", "gia_don_vi"
      ]
    },
    {
      key: "weightKg",
      label: "Weight (kg)",
      type: "number",
      required: false,
      aliases: [
        "weight", "weight_kg", "net_weight", "gross_weight",
        // Vietnamese
        "trong_luong", "trongluong", "can_nang", "khoi_luong", "khoiluong"
      ]
    },
    {
      key: "isCritical",
      label: "Critical",
      type: "boolean",
      required: false,
      aliases: [
        "critical", "is_critical", "important",
        // Vietnamese
        "quan_trong", "quantrong", "thiet_yeu", "can_thiet"
      ],
      defaultValue: false
    },
    {
      key: "minStockLevel",
      label: "Min Stock Level",
      type: "integer",
      required: false,
      aliases: [
        "min_stock", "minimum_qty", "min_quantity", "minimum_stock",
        // Vietnamese
        "ton_toi_thieu", "tonthoithieu", "sl_toi_thieu", "so_luong_toi_thieu"
      ],
      defaultValue: 0
    },
    {
      key: "reorderPoint",
      label: "Reorder Point",
      type: "integer",
      required: false,
      aliases: [
        "rop", "reorder_qty", "reorder_level",
        // Vietnamese
        "diem_dat_hang", "diemdathang", "muc_dat_hang", "nguong_dat_hang"
      ],
      defaultValue: 0
    },
    {
      key: "safetyStock",
      label: "Safety Stock",
      type: "integer",
      required: false,
      aliases: [
        "safety_qty", "buffer_stock", "reserve_stock",
        // Vietnamese
        "ton_an_toan", "tonantoan", "du_tru", "ton_du_phong"
      ],
      defaultValue: 0
    },
    {
      key: "shelfLifeDays",
      label: "Shelf Life (days)",
      type: "integer",
      required: false,
      aliases: [
        "shelf_life", "expiry_days", "storage_days",
        // Vietnamese
        "han_su_dung", "hansudung", "thoi_han", "so_ngay_bao_quan"
      ]
    },
    {
      key: "status",
      label: "Status",
      type: "enum",
      required: false,
      aliases: [
        // Vietnamese
        "trang_thai", "trangthai", "tinh_trang"
      ],
      enumValues: ["active", "inactive", "obsolete"],
      defaultValue: "active"
    },
  ],
  suppliers: [
    {
      key: "code",
      label: "Code",
      type: "string",
      required: true,
      aliases: [
        "supplier_code", "vendor_code", "supplier_id", "vendor_id",
        // Vietnamese
        "ma_ncc", "mancc", "ma_nha_cung_cap", "manhacungcap", "ma_vendor"
      ]
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      aliases: [
        "supplier_name", "vendor_name", "company", "company_name",
        // Vietnamese
        "ten_ncc", "tenncc", "ten_nha_cung_cap", "tennhacungcap", "ten_cong_ty"
      ]
    },
    {
      key: "country",
      label: "Country",
      type: "string",
      required: false,
      aliases: [
        "nation", "country_code", "region",
        // Vietnamese
        "quoc_gia", "quocgia", "nuoc", "vung"
      ]
    },
    {
      key: "contactName",
      label: "Contact Name",
      type: "string",
      required: false,
      aliases: [
        "contact", "primary_contact", "rep", "contact_person",
        // Vietnamese
        "nguoi_lien_he", "nguoilienhe", "lien_he", "nguoi_dai_dien"
      ]
    },
    {
      key: "contactEmail",
      label: "Email",
      type: "string",
      required: false,
      aliases: [
        "email", "contact_email", "e_mail", "email_address",
        // Vietnamese
        "dia_chi_email", "thu_dien_tu"
      ]
    },
    {
      key: "contactPhone",
      label: "Phone",
      type: "string",
      required: false,
      aliases: [
        "phone", "telephone", "contact_phone", "phone_number", "tel",
        // Vietnamese
        "dien_thoai", "dienthoai", "so_dt", "sodt", "sdt"
      ]
    },
    {
      key: "address",
      label: "Address",
      type: "string",
      required: false,
      aliases: [
        "full_address", "street_address", "location", "addr",
        // Vietnamese
        "dia_chi", "diachi", "noi_o", "vi_tri"
      ]
    },
    {
      key: "paymentTerms",
      label: "Payment Terms",
      type: "string",
      required: false,
      aliases: [
        "terms", "payment", "payment_condition",
        // Vietnamese
        "dieu_khoan_tt", "dieu_khoan_thanh_toan", "hinh_thuc_tt"
      ]
    },
    {
      key: "leadTimeDays",
      label: "Lead Time (days)",
      type: "integer",
      required: true,
      aliases: [
        "lead_time", "delivery_days", "lt", "delivery_time",
        // Vietnamese
        "thoi_gian_giao", "thoigiangiao", "so_ngay_giao", "lead_time_ngay"
      ]
    },
    {
      key: "rating",
      label: "Rating",
      type: "number",
      required: false,
      aliases: [
        "score", "vendor_rating", "supplier_rating", "grade",
        // Vietnamese
        "danh_gia", "danhgia", "diem", "xep_hang", "xephang"
      ]
    },
    {
      key: "category",
      label: "Category",
      type: "string",
      required: false,
      aliases: [
        "type", "supplier_type", "vendor_type",
        // Vietnamese
        "loai_ncc", "loainhacungcap", "phan_loai"
      ]
    },
    {
      key: "ndaaCompliant",
      label: "NDAA Compliant",
      type: "boolean",
      required: false,
      aliases: [
        "ndaa", "compliant", "ndaa_status",
        // Vietnamese
        "tuan_thu_ndaa", "ndaa_hop_le"
      ],
      defaultValue: true
    },
    {
      key: "status",
      label: "Status",
      type: "enum",
      required: false,
      aliases: [
        // Vietnamese
        "trang_thai", "trangthai", "tinh_trang"
      ],
      enumValues: ["active", "inactive", "blocked"],
      defaultValue: "active"
    },
  ],
  products: [
    {
      key: "sku",
      label: "SKU",
      type: "string",
      required: true,
      aliases: [
        "product_code", "item_sku", "product_number", "product_id",
        // Vietnamese
        "ma_sp", "masp", "ma_san_pham", "masanpham", "ma_thanh_pham"
      ]
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      aliases: [
        "product_name", "item_name", "title", "prod_name",
        // Vietnamese
        "ten_sp", "tensp", "ten_san_pham", "tensanpham", "ten_thanh_pham"
      ]
    },
    {
      key: "description",
      label: "Description",
      type: "string",
      required: false,
      aliases: [
        "desc", "product_desc", "details",
        // Vietnamese
        "mo_ta", "mota", "dien_giai", "chi_tiet"
      ]
    },
    {
      key: "basePrice",
      label: "Base Price",
      type: "number",
      required: false,
      aliases: [
        "price", "list_price", "msrp", "selling_price", "unit_price",
        // Vietnamese
        "gia", "gia_ban", "giaban", "don_gia", "gia_niem_yet", "gianiemyet"
      ]
    },
    {
      key: "assemblyHours",
      label: "Assembly Hours",
      type: "number",
      required: false,
      aliases: [
        "assembly_time", "build_hours", "production_hours",
        // Vietnamese
        "gio_lap_rap", "giolaprap", "thoi_gian_lap_rap", "so_gio_sx"
      ]
    },
    {
      key: "testingHours",
      label: "Testing Hours",
      type: "number",
      required: false,
      aliases: [
        "test_time", "qa_hours", "inspection_hours",
        // Vietnamese
        "gio_kiem_tra", "giokiemtra", "thoi_gian_kiem_tra", "so_gio_qc"
      ]
    },
    {
      key: "status",
      label: "Status",
      type: "enum",
      required: false,
      aliases: [
        // Vietnamese
        "trang_thai", "trangthai", "tinh_trang"
      ],
      enumValues: ["active", "inactive", "development", "obsolete"],
      defaultValue: "active"
    },
  ],
  customers: [
    {
      key: "code",
      label: "Code",
      type: "string",
      required: true,
      aliases: [
        "customer_code", "cust_code", "account_number", "customer_id",
        // Vietnamese
        "ma_kh", "makh", "ma_khach_hang", "makhachhang", "so_tai_khoan"
      ]
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      aliases: [
        "customer_name", "company_name", "account_name", "cust_name",
        // Vietnamese
        "ten_kh", "tenkh", "ten_khach_hang", "tenkhachhang", "ten_cong_ty"
      ]
    },
    {
      key: "type",
      label: "Type",
      type: "string",
      required: false,
      aliases: [
        "customer_type", "account_type", "cust_type",
        // Vietnamese
        "loai_kh", "loai_khach_hang", "phan_loai"
      ]
    },
    {
      key: "country",
      label: "Country",
      type: "string",
      required: false,
      aliases: [
        "nation", "country_code", "region",
        // Vietnamese
        "quoc_gia", "quocgia", "nuoc", "vung"
      ]
    },
    {
      key: "contactName",
      label: "Contact Name",
      type: "string",
      required: false,
      aliases: [
        "contact", "primary_contact", "contact_person",
        // Vietnamese
        "nguoi_lien_he", "nguoilienhe", "lien_he", "nguoi_dai_dien"
      ]
    },
    {
      key: "contactEmail",
      label: "Email",
      type: "string",
      required: false,
      aliases: [
        "email", "contact_email", "email_address",
        // Vietnamese
        "dia_chi_email", "thu_dien_tu"
      ]
    },
    {
      key: "contactPhone",
      label: "Phone",
      type: "string",
      required: false,
      aliases: [
        "phone", "contact_phone", "telephone", "tel",
        // Vietnamese
        "dien_thoai", "dienthoai", "so_dt", "sodt", "sdt"
      ]
    },
    {
      key: "billingAddress",
      label: "Billing Address",
      type: "string",
      required: false,
      aliases: [
        "address", "bill_to", "invoice_address",
        // Vietnamese
        "dia_chi", "diachi", "dia_chi_xuat_hd", "dia_chi_hoa_don"
      ]
    },
    {
      key: "paymentTerms",
      label: "Payment Terms",
      type: "string",
      required: false,
      aliases: [
        "terms", "payment", "payment_condition",
        // Vietnamese
        "dieu_khoan_tt", "dieu_khoan_thanh_toan", "hinh_thuc_tt"
      ]
    },
    {
      key: "creditLimit",
      label: "Credit Limit",
      type: "number",
      required: false,
      aliases: [
        "credit", "limit", "credit_amount",
        // Vietnamese
        "han_muc_tin_dung", "hanmuctindung", "gioi_han_no", "han_muc"
      ]
    },
    {
      key: "status",
      label: "Status",
      type: "enum",
      required: false,
      aliases: [
        // Vietnamese
        "trang_thai", "trangthai", "tinh_trang"
      ],
      enumValues: ["active", "inactive", "suspended"],
      defaultValue: "active"
    },
  ],
  inventory: [
    {
      key: "partNumber",
      label: "Part Number",
      type: "string",
      required: true,
      aliases: [
        "part", "pn", "item_number", "item_code",
        // Vietnamese
        "ma_sp", "masp", "ma_san_pham", "ma_vat_tu", "mavattu", "ma_hang"
      ]
    },
    {
      key: "warehouseCode",
      label: "Warehouse",
      type: "string",
      required: true,
      aliases: [
        "warehouse", "location", "wh_code", "storage",
        // Vietnamese
        "ma_kho", "makho", "kho", "nha_kho", "vi_tri_kho"
      ]
    },
    {
      key: "quantity",
      label: "Quantity",
      type: "integer",
      required: true,
      aliases: [
        "qty", "on_hand", "stock_qty", "stock", "available",
        // Vietnamese
        "so_luong", "soluong", "sl", "sl_ton", "ton_kho", "tonkho"
      ]
    },
    {
      key: "reservedQty",
      label: "Reserved Qty",
      type: "integer",
      required: false,
      aliases: [
        "reserved", "allocated", "committed",
        // Vietnamese
        "sl_giu", "da_giu", "sl_dat_truoc", "da_phan_bo"
      ],
      defaultValue: 0
    },
    {
      key: "lotNumber",
      label: "Lot Number",
      type: "string",
      required: false,
      aliases: [
        "lot", "batch", "batch_number", "lot_no",
        // Vietnamese
        "so_lo", "solo", "ma_lo", "malo", "so_batch"
      ]
    },
    {
      key: "locationCode",
      label: "Location Code",
      type: "string",
      required: false,
      aliases: [
        "bin", "slot", "storage_location", "bin_location",
        // Vietnamese
        "vi_tri", "vitri", "o_ke", "oke", "ke", "ngan"
      ]
    },
    {
      key: "expiryDate",
      label: "Expiry Date",
      type: "date",
      required: false,
      aliases: [
        "expiry", "exp_date", "best_before", "expiration",
        // Vietnamese
        "han_su_dung", "hansudung", "ngay_het_han", "hsd"
      ]
    },
  ],
  bom: [
    {
      key: "productSku",
      label: "Product SKU",
      type: "string",
      required: true,
      aliases: [
        "product", "parent_sku", "assembly", "parent_part", "finished_good",
        // Vietnamese
        "ma_tp", "matp", "ma_thanh_pham", "mathanhpham", "sp_cha"
      ]
    },
    {
      key: "partNumber",
      label: "Part Number",
      type: "string",
      required: true,
      aliases: [
        "component", "child_part", "part", "material", "item",
        // Vietnamese
        "ma_lk", "malk", "ma_linh_kien", "malinhkien", "vat_tu", "sp_con"
      ]
    },
    {
      key: "quantity",
      label: "Quantity",
      type: "number",
      required: true,
      aliases: [
        "qty", "per_assembly", "qty_per", "usage",
        // Vietnamese
        "so_luong", "soluong", "sl", "dinh_muc", "dinhmuc"
      ]
    },
    {
      key: "version",
      label: "Version",
      type: "string",
      required: false,
      aliases: [
        "bom_version", "rev", "revision",
        // Vietnamese
        "phien_ban", "phienban", "ver"
      ],
      defaultValue: "1.0"
    },
    {
      key: "level",
      label: "Level",
      type: "integer",
      required: false,
      aliases: [
        "bom_level", "indent", "depth",
        // Vietnamese
        "cap_do", "capdo", "cap", "muc"
      ],
      defaultValue: 1
    },
    {
      key: "moduleCode",
      label: "Module Code",
      type: "string",
      required: false,
      aliases: [
        "module", "subassembly", "sub_assy",
        // Vietnamese
        "ma_cum", "macum", "cum_lap_rap", "module_con"
      ]
    },
    {
      key: "position",
      label: "Position",
      type: "string",
      required: false,
      aliases: [
        "ref_des", "designator", "reference",
        // Vietnamese
        "vi_tri", "vitri", "vi_tri_lap"
      ]
    },
    {
      key: "scrapRate",
      label: "Scrap Rate",
      type: "number",
      required: false,
      aliases: [
        "scrap", "waste_factor", "loss_rate",
        // Vietnamese
        "ty_le_hao", "tylehao", "phe_pham", "hao_hut"
      ],
      defaultValue: 0
    },
    {
      key: "isCritical",
      label: "Critical",
      type: "boolean",
      required: false,
      aliases: [
        "critical", "important",
        // Vietnamese
        "quan_trong", "quantrong", "thiet_yeu"
      ],
      defaultValue: false
    },
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
