// src/lib/excel/exporter.ts
// Excel File Exporter

import * as XLSX from "xlsx";

export interface ExportColumn {
  key: string;
  header: string;
  width?: number;
  format?: "text" | "number" | "currency" | "date" | "datetime" | "boolean";
  transform?: (value: unknown) => unknown;
}

export interface ExportOptions {
  sheetName?: string;
  includeHeaders?: boolean;
  dateFormat?: string;
  numberFormat?: string;
  currencySymbol?: string;
  freezeHeader?: boolean;
  autoFilter?: boolean;
  columnWidths?: "auto" | "fixed" | number[];
}

export interface ExportResult {
  success: boolean;
  buffer?: Buffer;
  fileName?: string;
  error?: string;
  rowCount?: number;
}

// Default column definitions for each entity type
export const defaultColumnDefinitions: Record<string, ExportColumn[]> = {
  parts: [
    { key: "partNumber", header: "Part Number", width: 15 },
    { key: "name", header: "Name", width: 30 },
    { key: "category", header: "Category", width: 15 },
    { key: "description", header: "Description", width: 40 },
    { key: "unit", header: "Unit", width: 8 },
    { key: "unitCost", header: "Unit Cost", width: 12, format: "currency" },
    { key: "weightKg", header: "Weight (kg)", width: 12, format: "number" },
    { key: "isCritical", header: "Critical", width: 10, format: "boolean" },
    { key: "minStockLevel", header: "Min Stock", width: 12, format: "number" },
    { key: "reorderPoint", header: "Reorder Point", width: 14, format: "number" },
    { key: "safetyStock", header: "Safety Stock", width: 14, format: "number" },
    { key: "status", header: "Status", width: 10 },
  ],
  suppliers: [
    { key: "code", header: "Code", width: 12 },
    { key: "name", header: "Name", width: 30 },
    { key: "country", header: "Country", width: 15 },
    { key: "contactName", header: "Contact Name", width: 20 },
    { key: "contactEmail", header: "Email", width: 25 },
    { key: "contactPhone", header: "Phone", width: 15 },
    { key: "address", header: "Address", width: 40 },
    { key: "leadTimeDays", header: "Lead Time (days)", width: 16, format: "number" },
    { key: "rating", header: "Rating", width: 10, format: "number" },
    { key: "ndaaCompliant", header: "NDAA Compliant", width: 14, format: "boolean" },
    { key: "status", header: "Status", width: 10 },
  ],
  inventory: [
    { key: "part.partNumber", header: "Part Number", width: 15 },
    { key: "part.name", header: "Part Name", width: 30 },
    { key: "warehouse.code", header: "Warehouse", width: 12 },
    { key: "quantity", header: "Quantity", width: 12, format: "number" },
    { key: "reservedQty", header: "Reserved", width: 12, format: "number" },
    { key: "lotNumber", header: "Lot Number", width: 15 },
    { key: "locationCode", header: "Location", width: 12 },
    { key: "expiryDate", header: "Expiry Date", width: 12, format: "date" },
  ],
  products: [
    { key: "sku", header: "SKU", width: 15 },
    { key: "name", header: "Name", width: 30 },
    { key: "description", header: "Description", width: 40 },
    { key: "basePrice", header: "Base Price", width: 12, format: "currency" },
    { key: "assemblyHours", header: "Assembly Hours", width: 15, format: "number" },
    { key: "testingHours", header: "Testing Hours", width: 14, format: "number" },
    { key: "status", header: "Status", width: 10 },
  ],
  customers: [
    { key: "code", header: "Code", width: 12 },
    { key: "name", header: "Name", width: 30 },
    { key: "type", header: "Type", width: 12 },
    { key: "country", header: "Country", width: 15 },
    { key: "contactName", header: "Contact Name", width: 20 },
    { key: "contactEmail", header: "Email", width: 25 },
    { key: "contactPhone", header: "Phone", width: 15 },
    { key: "creditLimit", header: "Credit Limit", width: 14, format: "currency" },
    { key: "status", header: "Status", width: 10 },
  ],
  salesOrders: [
    { key: "orderNumber", header: "Order Number", width: 15 },
    { key: "customer.name", header: "Customer", width: 25 },
    { key: "orderDate", header: "Order Date", width: 12, format: "date" },
    { key: "requiredDate", header: "Required Date", width: 14, format: "date" },
    { key: "status", header: "Status", width: 12 },
    { key: "totalAmount", header: "Total Amount", width: 14, format: "currency" },
    { key: "priority", header: "Priority", width: 10 },
  ],
  purchaseOrders: [
    { key: "poNumber", header: "PO Number", width: 15 },
    { key: "supplier.name", header: "Supplier", width: 25 },
    { key: "orderDate", header: "Order Date", width: 12, format: "date" },
    { key: "expectedDate", header: "Expected Date", width: 14, format: "date" },
    { key: "status", header: "Status", width: 12 },
    { key: "totalAmount", header: "Total Amount", width: 14, format: "currency" },
  ],
  workOrders: [
    { key: "woNumber", header: "WO Number", width: 15 },
    { key: "product.name", header: "Product", width: 25 },
    { key: "quantity", header: "Quantity", width: 12, format: "number" },
    { key: "status", header: "Status", width: 12 },
    { key: "priority", header: "Priority", width: 10 },
    { key: "plannedStart", header: "Planned Start", width: 14, format: "date" },
    { key: "plannedEnd", header: "Planned End", width: 14, format: "date" },
  ],
};

// Get nested value from object
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let value: unknown = obj;

  for (const key of keys) {
    if (value === null || value === undefined) return null;
    value = (value as Record<string, unknown>)[key];
  }

  return value;
}

// Format value based on column format
function formatValue(
  value: unknown,
  format?: ExportColumn["format"]
): unknown {
  if (value === null || value === undefined) return "";

  switch (format) {
    case "currency":
      if (typeof value === "number") {
        return value; // Let Excel format as currency
      }
      return value;

    case "date":
      if (value instanceof Date) {
        return value;
      }
      if (typeof value === "string") {
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date;
      }
      return value;

    case "datetime":
      if (value instanceof Date) {
        return value;
      }
      return value;

    case "boolean":
      if (typeof value === "boolean") {
        return value ? "Yes" : "No";
      }
      return value;

    case "number":
      if (typeof value === "number") {
        return value;
      }
      if (typeof value === "string" && !isNaN(Number(value))) {
        return Number(value);
      }
      return value;

    default:
      return String(value);
  }
}

// Calculate auto column widths
function calculateAutoWidths(
  data: Record<string, unknown>[],
  columns: ExportColumn[]
): number[] {
  return columns.map((col) => {
    const headerLength = col.header.length;
    let maxDataLength = 0;

    for (const row of data.slice(0, 100)) {
      // Sample first 100 rows
      const value = getNestedValue(row, col.key);
      if (value !== null && value !== undefined) {
        const length = String(value).length;
        if (length > maxDataLength) maxDataLength = length;
      }
    }

    return Math.min(Math.max(headerLength, maxDataLength, 8) + 2, 50);
  });
}

// Create Excel workbook from data
export function createExcelWorkbook(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  options: ExportOptions = {}
): XLSX.WorkBook {
  const {
    sheetName = "Data",
    includeHeaders = true,
    freezeHeader = true,
    autoFilter = true,
    columnWidths = "auto",
  } = options;

  // Prepare rows
  const rows: unknown[][] = [];

  // Add header row
  if (includeHeaders) {
    rows.push(columns.map((col) => col.header));
  }

  // Add data rows
  for (const item of data) {
    const row = columns.map((col) => {
      const value = getNestedValue(item, col.key);
      const transformed = col.transform ? col.transform(value) : value;
      return formatValue(transformed, col.format);
    });
    rows.push(row);
  }

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  if (columnWidths === "auto") {
    const widths = calculateAutoWidths(data, columns);
    worksheet["!cols"] = widths.map((w) => ({ wch: w }));
  } else if (columnWidths === "fixed") {
    worksheet["!cols"] = columns.map((col) => ({ wch: col.width || 15 }));
  } else if (Array.isArray(columnWidths)) {
    worksheet["!cols"] = columnWidths.map((w) => ({ wch: w }));
  }

  // Freeze header row
  if (freezeHeader && includeHeaders) {
    worksheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" };
  }

  // Add auto filter
  if (autoFilter && includeHeaders && rows.length > 1) {
    const lastCol = XLSX.utils.encode_col(columns.length - 1);
    const lastRow = rows.length;
    worksheet["!autofilter"] = { ref: `A1:${lastCol}${lastRow}` };
  }

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  return workbook;
}

// Export to Excel buffer
export function exportToExcelBuffer(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  options: ExportOptions = {}
): ExportResult {
  try {
    const workbook = createExcelWorkbook(data, columns, options);

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
      compression: true,
    }) as Buffer;

    return {
      success: true,
      buffer,
      rowCount: data.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Export failed",
    };
  }
}

// Export to CSV buffer
export function exportToCSVBuffer(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  options: ExportOptions = {}
): ExportResult {
  try {
    const workbook = createExcelWorkbook(data, columns, options);

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "csv",
    }) as Buffer;

    return {
      success: true,
      buffer,
      rowCount: data.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Export failed",
    };
  }
}

// Export to base64
export function exportToBase64(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  format: "xlsx" | "csv" = "xlsx",
  options: ExportOptions = {}
): ExportResult {
  const result =
    format === "csv"
      ? exportToCSVBuffer(data, columns, options)
      : exportToExcelBuffer(data, columns, options);

  if (result.success && result.buffer) {
    return {
      ...result,
      buffer: undefined,
      fileName: `export.${format}`,
    };
  }

  return result;
}

// Generate template file for importing
export function generateImportTemplate(
  entityType: string,
  includeSampleData: boolean = true
): ExportResult {
  const columns = defaultColumnDefinitions[entityType];
  if (!columns) {
    return {
      success: false,
      error: `Unknown entity type: ${entityType}`,
    };
  }

  const sampleData: Record<string, Record<string, unknown>> = {
    parts: {
      partNumber: "PART-001",
      name: "Sample Part",
      category: "Electronics",
      description: "A sample part for import",
      unit: "pcs",
      unitCost: 10.5,
      weightKg: 0.25,
      isCritical: false,
      minStockLevel: 10,
      reorderPoint: 25,
      safetyStock: 15,
      status: "active",
    },
    suppliers: {
      code: "SUP-001",
      name: "Sample Supplier",
      country: "USA",
      contactName: "John Doe",
      contactEmail: "john@supplier.com",
      contactPhone: "+1-555-1234",
      address: "123 Main St, City, State 12345",
      leadTimeDays: 14,
      rating: 4.5,
      ndaaCompliant: true,
      status: "active",
    },
    products: {
      sku: "PROD-001",
      name: "Sample Product",
      description: "A sample product",
      basePrice: 299.99,
      assemblyHours: 2.5,
      testingHours: 0.5,
      status: "active",
    },
    customers: {
      code: "CUST-001",
      name: "Sample Customer",
      type: "OEM",
      country: "USA",
      contactName: "Jane Smith",
      contactEmail: "jane@customer.com",
      contactPhone: "+1-555-5678",
      creditLimit: 50000,
      status: "active",
    },
  };

  const data = includeSampleData && sampleData[entityType] ? [sampleData[entityType]] : [];

  return exportToExcelBuffer(data, columns, {
    sheetName: `${entityType}_template`,
    includeHeaders: true,
    freezeHeader: true,
  });
}

// Generate multi-sheet workbook
export function createMultiSheetWorkbook(
  sheets: { name: string; data: Record<string, unknown>[]; columns: ExportColumn[] }[]
): ExportResult {
  try {
    const workbook = XLSX.utils.book_new();

    for (const sheet of sheets) {
      const rows: unknown[][] = [];
      rows.push(sheet.columns.map((col) => col.header));

      for (const item of sheet.data) {
        const row = sheet.columns.map((col) => {
          const value = getNestedValue(item, col.key);
          return formatValue(value, col.format);
        });
        rows.push(row);
      }

      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      const widths = calculateAutoWidths(sheet.data, sheet.columns);
      worksheet["!cols"] = widths.map((w) => ({ wch: w }));

      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    }

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
      compression: true,
    }) as Buffer;

    return {
      success: true,
      buffer,
      rowCount: sheets.reduce((sum, s) => sum + s.data.length, 0),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Export failed",
    };
  }
}
