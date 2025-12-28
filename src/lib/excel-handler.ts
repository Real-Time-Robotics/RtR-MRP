// lib/excel-handler.ts
import * as XLSX from "xlsx";

interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

interface ExportConfig {
  data: Record<string, unknown>[];
  columns: ExportColumn[];
  sheetName?: string;
}

export function exportToExcel(config: ExportConfig): Blob {
  const { data, columns, sheetName = "Data" } = config;

  // Create worksheet data
  const wsData = [
    columns.map((c) => c.header),
    ...data.map((row) => columns.map((c) => row[c.key] ?? "")),
  ];

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws["!cols"] = columns.map((c) => ({ wch: c.width || 15 }));

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Generate buffer
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

interface ImportResult {
  success: boolean;
  data?: Record<string, unknown>[];
  errors?: { row: number; message: string }[];
  totalRows: number;
  successRows: number;
  errorRows: number;
}

export async function importFromExcel(
  file: File,
  mapping: Record<string, string>,
  validator?: (row: Record<string, unknown>) => { valid: boolean; error?: string }
): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];

  const results: Record<string, unknown>[] = [];
  const errors: { row: number; message: string }[] = [];

  rawData.forEach((row, index) => {
    // Map columns
    const mappedRow: Record<string, unknown> = {};
    Object.entries(mapping).forEach(([excelCol, dbCol]) => {
      mappedRow[dbCol] = row[excelCol];
    });

    // Validate if validator provided
    if (validator) {
      const validation = validator(mappedRow);
      if (!validation.valid) {
        errors.push({
          row: index + 2,
          message: validation.error || "Validation failed",
        });
        return;
      }
    }

    results.push(mappedRow);
  });

  return {
    success: errors.length === 0,
    data: results,
    errors: errors.length > 0 ? errors : undefined,
    totalRows: rawData.length,
    successRows: results.length,
    errorRows: errors.length,
  };
}

// Generate import template
export function generateImportTemplate(type: string): Blob {
  const templates: Record<string, { headers: string[]; sample: Record<string, unknown>[] }> = {
    parts: {
      headers: [
        "Part Number",
        "Name",
        "Category",
        "Unit Cost",
        "Min Stock",
        "Reorder Point",
      ],
      sample: [
        {
          "Part Number": "PRT-NEW-001",
          Name: "Sample Part",
          Category: "Electronics",
          "Unit Cost": 100,
          "Min Stock": 10,
          "Reorder Point": 20,
        },
      ],
    },
    suppliers: {
      headers: [
        "Code",
        "Name",
        "Country",
        "Contact Name",
        "Contact Email",
        "Lead Time Days",
      ],
      sample: [
        {
          Code: "SUP-NEW",
          Name: "New Supplier",
          Country: "USA",
          "Contact Name": "John Doe",
          "Contact Email": "john@example.com",
          "Lead Time Days": 14,
        },
      ],
    },
    inventory: {
      headers: ["Part Number", "Warehouse", "Quantity", "Lot Number", "Expiry Date"],
      sample: [
        {
          "Part Number": "PRT-001",
          Warehouse: "MAIN",
          Quantity: 100,
          "Lot Number": "LOT-001",
          "Expiry Date": "2025-12-31",
        },
      ],
    },
  };

  const template = templates[type];
  if (!template) throw new Error(`Unknown template type: ${type}`);

  const ws = XLSX.utils.json_to_sheet(template.sample);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

// Export helpers for specific data types
export function exportPartsToExcel(
  parts: Array<{
    partNumber: string;
    name: string;
    category: string;
    unitCost: number;
    quantity: number;
    status: string;
  }>
): Blob {
  return exportToExcel({
    data: parts,
    columns: [
      { header: "Part Number", key: "partNumber", width: 15 },
      { header: "Name", key: "name", width: 30 },
      { header: "Category", key: "category", width: 15 },
      { header: "Unit Cost", key: "unitCost", width: 12 },
      { header: "Quantity", key: "quantity", width: 10 },
      { header: "Status", key: "status", width: 10 },
    ],
    sheetName: "Parts",
  });
}

export function exportSuppliersToExcel(
  suppliers: Array<{
    code: string;
    name: string;
    country: string;
    leadTimeDays: number;
    rating: number;
    status: string;
  }>
): Blob {
  return exportToExcel({
    data: suppliers,
    columns: [
      { header: "Code", key: "code", width: 12 },
      { header: "Name", key: "name", width: 30 },
      { header: "Country", key: "country", width: 15 },
      { header: "Lead Time (days)", key: "leadTimeDays", width: 15 },
      { header: "Rating", key: "rating", width: 10 },
      { header: "Status", key: "status", width: 10 },
    ],
    sheetName: "Suppliers",
  });
}

export function exportOrdersToExcel(
  orders: Array<{
    orderNumber: string;
    customer: string;
    orderDate: string;
    requiredDate: string;
    status: string;
    totalAmount: number;
  }>
): Blob {
  return exportToExcel({
    data: orders,
    columns: [
      { header: "Order Number", key: "orderNumber", width: 15 },
      { header: "Customer", key: "customer", width: 30 },
      { header: "Order Date", key: "orderDate", width: 12 },
      { header: "Required Date", key: "requiredDate", width: 12 },
      { header: "Status", key: "status", width: 12 },
      { header: "Total", key: "totalAmount", width: 15 },
    ],
    sheetName: "Orders",
  });
}
