// src/lib/excel/parser.ts
// Excel File Parser

import * as XLSX from "xlsx";

export interface ParsedColumn {
  index: number;
  header: string;
  sampleValues: (string | number | boolean | null)[];
  inferredType: "string" | "number" | "date" | "boolean" | "mixed";
  hasNulls: boolean;
  uniqueCount: number;
}

export interface ParsedSheet {
  name: string;
  rowCount: number;
  columnCount: number;
  columns: ParsedColumn[];
  headers: string[];
  data: Record<string, unknown>[];
  rawData: unknown[][];
}

export interface ParseResult {
  success: boolean;
  fileName: string;
  fileSize: number;
  sheets: ParsedSheet[];
  activeSheet: string;
  errors?: string[];
}

// Infer column type from sample values
function inferColumnType(
  values: unknown[]
): "string" | "number" | "date" | "boolean" | "mixed" {
  const types = new Set<string>();

  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;

    if (typeof value === "number") {
      types.add("number");
    } else if (typeof value === "boolean") {
      types.add("boolean");
    } else if (value instanceof Date) {
      types.add("date");
    } else if (typeof value === "string") {
      // Check if it looks like a date
      const datePattern =
        /^\d{4}-\d{2}-\d{2}$|^\d{1,2}\/\d{1,2}\/\d{2,4}$|^\d{1,2}-\d{1,2}-\d{2,4}$/;
      if (datePattern.test(value)) {
        types.add("date");
      } else if (!isNaN(Number(value)) && value.trim() !== "") {
        types.add("number");
      } else if (
        value.toLowerCase() === "true" ||
        value.toLowerCase() === "false"
      ) {
        types.add("boolean");
      } else {
        types.add("string");
      }
    } else {
      types.add("string");
    }
  }

  if (types.size === 0) return "string";
  if (types.size === 1) return types.values().next().value as ReturnType<typeof inferColumnType>;
  return "mixed";
}

// Parse a worksheet
function parseSheet(worksheet: XLSX.WorkSheet, sheetName: string): ParsedSheet {
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
  const rowCount = range.e.r - range.s.r;
  const columnCount = range.e.c - range.s.c + 1;

  // Get raw data as 2D array
  const rawData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  // Extract headers (first row)
  const headerRow = (rawData[0] || []) as (string | number | null)[];
  const headers = headerRow.map((h, i) =>
    h !== null && h !== undefined ? String(h) : `Column_${i + 1}`
  );

  // Get data rows (skip header)
  const dataRows = rawData.slice(1);

  // Analyze columns
  const columns: ParsedColumn[] = headers.map((header, index) => {
    const values = dataRows.map((row) => (row as unknown[])[index]);
    const nonNullValues = values.filter(
      (v) => v !== null && v !== undefined && v !== ""
    );
    const uniqueValues = new Set(nonNullValues.map(String));

    return {
      index,
      header,
      sampleValues: values.slice(0, 5) as (string | number | boolean | null)[],
      inferredType: inferColumnType(nonNullValues),
      hasNulls: values.some((v) => v === null || v === undefined || v === ""),
      uniqueCount: uniqueValues.size,
    };
  });

  // Convert to array of objects
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: null,
    raw: true,
  });

  return {
    name: sheetName,
    rowCount,
    columnCount,
    columns,
    headers,
    data,
    rawData,
  };
}

// Parse Excel file from buffer
export function parseExcelBuffer(
  buffer: Buffer,
  fileName: string
): ParseResult {
  try {
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: true,
      cellNF: true,
      cellStyles: false,
    });

    const sheets: ParsedSheet[] = workbook.SheetNames.map((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      return parseSheet(worksheet, sheetName);
    });

    return {
      success: true,
      fileName,
      fileSize: buffer.length,
      sheets,
      activeSheet: workbook.SheetNames[0],
    };
  } catch (error) {
    return {
      success: false,
      fileName,
      fileSize: buffer.length,
      sheets: [],
      activeSheet: "",
      errors: [error instanceof Error ? error.message : "Failed to parse file"],
    };
  }
}

// Parse Excel file from base64 string
export function parseExcelBase64(
  base64: string,
  fileName: string
): ParseResult {
  const buffer = Buffer.from(base64, "base64");
  return parseExcelBuffer(buffer, fileName);
}

// Get preview data for a sheet
export function getSheetPreview(
  sheet: ParsedSheet,
  maxRows: number = 10
): Record<string, unknown>[] {
  return sheet.data.slice(0, maxRows);
}

// Detect entity type from headers
export function detectEntityType(
  headers: string[]
): {
  entityType: string | null;
  confidence: number;
  matchedHeaders: string[];
} {
  const normalizedHeaders = headers.map((h) =>
    h.toLowerCase().replace(/[^a-z0-9]/g, "")
  );

  const entityPatterns: Record<string, { required: string[]; optional: string[] }> = {
    parts: {
      required: ["partnumber", "name"],
      optional: [
        "category",
        "description",
        "unit",
        "unitcost",
        "cost",
        "price",
        "weight",
        "safetystock",
        "reorderpoint",
      ],
    },
    suppliers: {
      required: ["code", "name"],
      optional: [
        "country",
        "contact",
        "email",
        "phone",
        "address",
        "leadtime",
        "rating",
      ],
    },
    inventory: {
      required: ["partnumber"],
      optional: [
        "warehouse",
        "quantity",
        "qty",
        "location",
        "lotnumber",
        "lot",
        "expiry",
      ],
    },
    products: {
      required: ["sku", "name"],
      optional: ["description", "price", "baseprice", "assemblyhours", "testinghours"],
    },
    customers: {
      required: ["code", "name"],
      optional: ["type", "country", "contact", "email", "phone", "creditlimit"],
    },
    bom: {
      required: ["productsku", "partnumber", "quantity"],
      optional: ["version", "level", "module", "position", "scraprate"],
    },
  };

  let bestMatch: { type: string; score: number; matched: string[] } | null = null;

  for (const [entityType, patterns] of Object.entries(entityPatterns)) {
    const matchedRequired = patterns.required.filter((req) =>
      normalizedHeaders.some(
        (h) => h.includes(req) || req.includes(h)
      )
    );

    const matchedOptional = patterns.optional.filter((opt) =>
      normalizedHeaders.some(
        (h) => h.includes(opt) || opt.includes(h)
      )
    );

    // All required fields must match
    if (matchedRequired.length === patterns.required.length) {
      const score =
        matchedRequired.length * 2 +
        matchedOptional.length +
        (normalizedHeaders.length > 0
          ? (matchedRequired.length + matchedOptional.length) /
            normalizedHeaders.length
          : 0);

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = {
          type: entityType,
          score,
          matched: [...matchedRequired, ...matchedOptional],
        };
      }
    }
  }

  if (bestMatch) {
    return {
      entityType: bestMatch.type,
      confidence: Math.min(bestMatch.score / 5, 1),
      matchedHeaders: bestMatch.matched,
    };
  }

  return {
    entityType: null,
    confidence: 0,
    matchedHeaders: [],
  };
}

// CSV parsing support
export function parseCSVBuffer(buffer: Buffer, fileName: string): ParseResult {
  try {
    const content = buffer.toString("utf-8");
    const workbook = XLSX.read(content, {
      type: "string",
      cellDates: true,
    });

    const sheets: ParsedSheet[] = workbook.SheetNames.map((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      return parseSheet(worksheet, sheetName);
    });

    return {
      success: true,
      fileName,
      fileSize: buffer.length,
      sheets,
      activeSheet: workbook.SheetNames[0] || "Sheet1",
    };
  } catch (error) {
    return {
      success: false,
      fileName,
      fileSize: buffer.length,
      sheets: [],
      activeSheet: "",
      errors: [error instanceof Error ? error.message : "Failed to parse CSV"],
    };
  }
}

// Auto-detect file type and parse
export function parseFile(
  buffer: Buffer,
  fileName: string
): ParseResult {
  const extension = fileName.toLowerCase().split(".").pop();

  if (extension === "csv") {
    return parseCSVBuffer(buffer, fileName);
  } else if (extension === "xlsx" || extension === "xls") {
    return parseExcelBuffer(buffer, fileName);
  } else {
    return {
      success: false,
      fileName,
      fileSize: buffer.length,
      sheets: [],
      activeSheet: "",
      errors: [`Unsupported file type: ${extension}`],
    };
  }
}
