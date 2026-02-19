// src/lib/import/ai-analyzer.ts
// Core AI analysis engine - parses Excel files and maps columns using Vietnamese header dictionary

import * as XLSX from "xlsx";
import { findBestMatch, detectEntityType } from "./vietnamese-headers";
import prisma from "@/lib/prisma";

export interface ColumnMapping {
  excelColumn: string;
  excelIndex: number;
  mappedTo: string | null;
  confidence: number;
  sampleValues: string[];
  suggestion?: string;
}

export interface AnalysisResult {
  sessionId: string;
  fileName: string;
  sheets: string[];
  selectedSheet: string;
  detectedType: string;
  typeConfidence: number;
  columns: ColumnMapping[];
  totalRows: number;
  issues: {
    type: "ERROR" | "WARNING" | "INFO";
    row?: number;
    column?: string;
    message: string;
  }[];
  summary: {
    mappedColumns: number;
    unmappedColumns: number;
    estimatedImportable: number;
    emptyRows: number;
  };
}

export async function analyzeFile(
  fileBuffer: Buffer,
  fileName: string,
  userId: string,
  selectedSheet?: string
): Promise<AnalysisResult> {
  // 1. Parse Excel
  const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
  const sheets = workbook.SheetNames;
  const sheetName = selectedSheet || sheets[0];
  const sheet = workbook.Sheets[sheetName];

  // 2. Convert to array
  const data = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  }) as unknown[][];

  if (data.length < 2) {
    throw new Error("File phải có ít nhất 2 dòng (header + data)");
  }

  const headers = data[0].map((h) => String(h || "").trim());
  const rows = data.slice(1).filter((row) => row.some((cell) => cell !== ""));

  // 3. Detect entity type first
  const detected = detectEntityType(headers);
  const entityType = detected.type !== "unknown" ? detected.type : undefined;

  // 4. Map columns using Vietnamese header dictionary
  const usedFields = new Set<string>();
  const columns: ColumnMapping[] = headers.map((header, index) => {
    const match = findBestMatch(header, entityType);
    const sampleValues = rows
      .slice(0, 5)
      .map((row) => String(row[index] || ""))
      .filter((v) => v.trim() !== "")
      .slice(0, 3);

    // Avoid duplicate field mappings
    let mappedTo = match?.field || null;
    if (mappedTo && usedFields.has(mappedTo)) {
      mappedTo = null;
    }
    if (mappedTo) {
      usedFields.add(mappedTo);
    }

    return {
      excelColumn: header,
      excelIndex: index,
      mappedTo,
      confidence: match?.confidence || 0,
      sampleValues,
      suggestion: match
        ? undefined
        : inferFromSamples(sampleValues),
    };
  });

  // 5. Detect type with scoring
  const detectedType = detectFileType(columns);

  // 6. Find issues
  const issues = findIssues(rows, columns, detectedType.type);

  // 7. Create import session
  const session = await prisma.importSession.create({
    data: {
      fileName,
      fileSize: fileBuffer.length,
      fileType: fileName.split(".").pop() || "xlsx",
      detectedType: detectedType.type,
      confidence: detectedType.confidence,
      status: "ANALYZING",
      totalRows: rows.length,
      columnMapping: columns as unknown as object,
      importedBy: userId,
    },
  });

  // 8. Summary
  const mappedColumns = columns.filter((c) => c.mappedTo).length;
  const emptyRows = data
    .slice(1)
    .filter((row) => row.every((cell) => !cell)).length;

  return {
    sessionId: session.id,
    fileName,
    sheets,
    selectedSheet: sheetName,
    detectedType: detectedType.type,
    typeConfidence: detectedType.confidence,
    columns,
    totalRows: rows.length,
    issues,
    summary: {
      mappedColumns,
      unmappedColumns: columns.length - mappedColumns,
      estimatedImportable:
        rows.length - issues.filter((i) => i.type === "ERROR").length,
      emptyRows,
    },
  };
}

function inferFromSamples(values: string[]): string | undefined {
  if (!values || values.length === 0) return undefined;

  const samples = values.filter((v) => v && v.trim());
  if (samples.length === 0) return undefined;

  // Email pattern
  if (samples.every((v) => /@/.test(v))) {
    return "Có thể là: email";
  }

  // Phone pattern (8+ digits)
  if (samples.every((v) => /^[\d\s+()-]{8,}$/.test(v.replace(/\s/g, "")))) {
    return "Có thể là: phone";
  }

  // Date pattern
  if (samples.every((v) => /\d{1,4}[/-]\d{1,2}[/-]\d{1,4}/.test(v))) {
    return "Có thể là: ngày";
  }

  // Number/price pattern
  if (samples.every((v) => /^[\d,.\s]+$/.test(v))) {
    return "Có thể là: số (quantity, cost, moq)";
  }

  // Tax ID pattern (10-13 digits)
  if (
    samples.every((v) => /^\d{10,13}$/.test(v.replace(/[.-]/g, "")))
  ) {
    return "Có thể là: mã số thuế";
  }

  return undefined;
}

function detectFileType(
  columns: ColumnMapping[]
): { type: string; confidence: number } {
  const mappedFields = columns
    .filter((c) => c.mappedTo)
    .map((c) => c.mappedTo!);

  const scores: Record<string, number> = {
    PARTS: 0,
    BOM: 0,
    SUPPLIERS: 0,
    INVENTORY: 0,
  };

  // Parts indicators
  if (mappedFields.includes("partNumber")) scores.PARTS += 3;
  if (mappedFields.includes("name")) scores.PARTS += 2;
  if (mappedFields.includes("unitCost")) scores.PARTS += 2;
  if (mappedFields.includes("unit")) scores.PARTS += 1;
  if (mappedFields.includes("category")) scores.PARTS += 1;
  if (mappedFields.includes("moq")) scores.PARTS += 1;

  // BOM indicators
  if (mappedFields.includes("parentPart")) scores.BOM += 4;
  if (mappedFields.includes("childPart")) scores.BOM += 4;
  if (mappedFields.includes("bomQuantity")) scores.BOM += 3;
  if (mappedFields.includes("scrapRate")) scores.BOM += 1;

  // Supplier indicators
  if (mappedFields.includes("supplierName")) scores.SUPPLIERS += 4;
  if (mappedFields.includes("taxId")) scores.SUPPLIERS += 3;
  if (mappedFields.includes("contactName")) scores.SUPPLIERS += 2;
  if (mappedFields.includes("supplierCode")) scores.SUPPLIERS += 2;

  // Inventory indicators
  if (mappedFields.includes("lotNumber")) scores.INVENTORY += 4;
  if (mappedFields.includes("warehouse")) scores.INVENTORY += 3;
  if (mappedFields.includes("quantityOnHand")) scores.INVENTORY += 2;
  if (mappedFields.includes("expiryDate")) scores.INVENTORY += 2;

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const best = sorted[0];

  return {
    type: best[1] > 3 ? best[0] : "UNKNOWN",
    confidence: Math.min(best[1] / 10, 1.0),
  };
}

function findIssues(
  rows: unknown[][],
  columns: ColumnMapping[],
  detectedType: string
): {
  type: "ERROR" | "WARNING" | "INFO";
  row?: number;
  column?: string;
  message: string;
}[] {
  const issues: {
    type: "ERROR" | "WARNING" | "INFO";
    row?: number;
    column?: string;
    message: string;
  }[] = [];

  // Check required fields
  const requiredFields: Record<string, string[]> = {
    PARTS: ["partNumber"],
    BOM: ["parentPart", "childPart", "bomQuantity"],
    SUPPLIERS: ["supplierName"],
    INVENTORY: ["partNumber", "quantityOnHand"],
  };

  const required = requiredFields[detectedType] || [];
  const mappedFields = columns
    .filter((c) => c.mappedTo)
    .map((c) => c.mappedTo!);

  for (const field of required) {
    if (!mappedFields.includes(field)) {
      issues.push({
        type: "ERROR",
        message: `Thiếu cột bắt buộc: ${field}`,
      });
    }
  }

  // Check for empty required values in rows (max 10 errors shown)
  const partNumberCol = columns.find((c) => c.mappedTo === "partNumber");
  if (partNumberCol) {
    let errorCount = 0;
    rows.forEach((row, idx) => {
      const value = row[partNumberCol.excelIndex];
      if ((!value || String(value).trim() === "") && errorCount < 10) {
        errorCount++;
        issues.push({
          type: "ERROR",
          row: idx + 2,
          column: partNumberCol.excelColumn,
          message: `Dòng ${idx + 2}: Mã sản phẩm trống`,
        });
      }
    });
  }

  // Unmapped columns warning
  const unmapped = columns.filter(
    (c) => !c.mappedTo && c.excelColumn
  );
  if (unmapped.length > 0) {
    issues.push({
      type: "WARNING",
      message: `${unmapped.length} cột chưa được map: ${unmapped
        .map((c) => c.excelColumn)
        .join(", ")}`,
    });
  }

  // Info: total rows
  if (rows.length > 0) {
    issues.push({
      type: "INFO",
      message: `Tìm thấy ${rows.length} dòng dữ liệu`,
    });
  }

  return issues;
}
