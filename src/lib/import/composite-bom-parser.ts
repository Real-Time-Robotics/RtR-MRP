// src/lib/import/composite-bom-parser.ts
// Parse composite BOM Excel files containing Parts + Products + BOM lines in a single sheet

import { normalizeVietnamese } from "./vietnamese-headers";

// ============================================
// TYPES
// ============================================

export interface ParsedPart {
  partNumber: string;
  name: string;
  category: string;
  unit: string;
  unitCost: number;
  method: "MAKE" | "BUY";
}

export interface ParsedProduct {
  sku: string;
  name: string;
}

export interface ParsedBomLine {
  parentSku: string;
  childPartNumber: string;
  quantity: number;
  scrapRate: number;
}

export interface CompositeAnalysisResult {
  isComposite: boolean;
  confidence: number;
  parts: ParsedPart[];
  products: ParsedProduct[];
  bomLines: ParsedBomLine[];
  stats: {
    totalRows: number;
    partCount: number;
    productCount: number;
    bomLineCount: number;
    skippedRows: number;
  };
  warnings: string[];
}

// ============================================
// KNOWN COLUMN NAMES (for this BOM format)
// ============================================

const COLUMN_ALIASES: Record<string, string[]> = {
  no: ["no", "no.", "stt", "tt", "s/n"],
  module: ["module", "mo dun", "cụm", "cum", "module name"],
  group: ["group", "nhóm", "nhom", "loại", "loai"],
  partNumber: [
    "part number", "part no", "part_number", "mã sp", "ma sp",
    "mã linh kiện", "ma linh kien", "mã vật tư", "ma vat tu", "code",
    "mã", "ma", "part no.",
  ],
  partName: [
    "name", "tên", "ten", "tên sp", "ten sp", "tên linh kiện",
    "ten linh kien", "description", "mô tả", "mo ta", "part name",
    "tên chi tiết", "ten chi tiet", "chi tiết", "chi tiet",
  ],
  unit: ["unit", "đvt", "dvt", "đơn vị", "don vi", "uom"],
  unitCost: [
    "unit cost", "đơn giá", "don gia", "giá", "gia", "cost",
    "giá thành", "gia thanh", "price", "đơn giá nhập", "don gia nhap",
  ],
  quantity: [
    "qty", "quantity", "số lượng", "so luong", "sl", "định mức",
    "dinh muc", "qty per", "sl/sp",
  ],
  yield: [
    "yield", "hiệu suất", "hieu suat", "tỷ lệ", "ty le",
    "yield %", "yield rate",
  ],
  scrapRate: [
    "scrap", "scrap rate", "hao hụt", "hao hut",
    "tỷ lệ hao hụt", "ty le hao hut", "waste",
  ],
  method: [
    "method", "phương pháp", "phuong phap", "pp",
    "phương pháp gia công", "phuong phap gia cong",
    "procurement", "source",
  ],
};

// ============================================
// DETECTION
// ============================================

export function detectCompositeStructure(
  headers: string[],
  sampleRows: unknown[][]
): { isComposite: boolean; confidence: number } {
  const normalizedHeaders = headers.map((h) => normalizeVietnamese(h));
  let signals = 0;
  const totalSignals = 5;

  // Signal 1: Has "Module" column
  const hasModule = normalizedHeaders.some((h) =>
    COLUMN_ALIASES.module.some((a) => normalizeVietnamese(a) === h || h.includes(normalizeVietnamese(a)))
  );
  if (hasModule) signals++;

  // Signal 2: Has "No." column
  const hasNo = normalizedHeaders.some((h) =>
    COLUMN_ALIASES.no.some((a) => normalizeVietnamese(a) === h)
  );
  if (hasNo) signals++;

  // Signal 3: Has part fields (Part Number / Unit Cost)
  const hasPartFields = normalizedHeaders.some((h) =>
    COLUMN_ALIASES.partNumber.some((a) => normalizeVietnamese(a) === h || h.includes(normalizeVietnamese(a)))
  );
  if (hasPartFields) signals++;

  // Signal 4: Has BOM fields (Qty / Yield)
  const hasQty = normalizedHeaders.some((h) =>
    COLUMN_ALIASES.quantity.some((a) => normalizeVietnamese(a) === h || h.includes(normalizeVietnamese(a)))
  );
  if (hasQty) signals++;

  // Signal 5: Some rows have null No. + Group="Group" pattern (module headers)
  const noIdx = findColumnIndex(normalizedHeaders, "no");
  const groupIdx = findColumnIndex(normalizedHeaders, "group");
  if (noIdx !== -1 && groupIdx !== -1) {
    const moduleHeaderRows = sampleRows.filter((row) => {
      const noVal = row[noIdx];
      const groupVal = String(row[groupIdx] || "").toLowerCase().trim();
      return (!noVal || String(noVal).trim() === "") && groupVal === "group";
    });
    if (moduleHeaderRows.length > 0) signals++;
  }

  const confidence = signals / totalSignals;
  return {
    isComposite: confidence >= 0.6,
    confidence,
  };
}

// ============================================
// SPLITTING
// ============================================

export function splitCompositeData(
  headers: string[],
  rows: unknown[][]
): CompositeAnalysisResult {
  const normalizedHeaders = headers.map((h) => normalizeVietnamese(h));
  const warnings: string[] = [];

  // Map column indices
  const colIdx: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    colIdx[field] = findColumnIndex(normalizedHeaders, field);
    if (colIdx[field] === -1 && aliases.length > 0) {
      // Try broader matching
      for (let i = 0; i < normalizedHeaders.length; i++) {
        const h = normalizedHeaders[i];
        for (const alias of aliases) {
          const na = normalizeVietnamese(alias);
          if (h === na || (h.includes(na) && na.length >= 3)) {
            colIdx[field] = i;
            break;
          }
        }
        if (colIdx[field] !== -1) break;
      }
    }
  }

  // Warn about missing columns
  const criticalCols = ["partNumber", "quantity"];
  for (const col of criticalCols) {
    if (colIdx[col] === -1) {
      warnings.push(`Không tìm thấy cột: ${col}`);
    }
  }

  const partsMap = new Map<string, ParsedPart>();
  const productsMap = new Map<string, ParsedProduct>();
  const bomLines: ParsedBomLine[] = [];
  let skippedRows = 0;

  let currentParentSku = "";

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowType = classifyRow(row, colIdx);

    switch (rowType) {
      case "MODULE_HEADER": {
        // Extract product SKU and name from this row
        const moduleName = getCell(row, colIdx.module) || getCell(row, colIdx.partName) || "";
        const partNum = getCell(row, colIdx.partNumber) || "";
        const sku = partNum || generateSku(moduleName);

        if (sku) {
          currentParentSku = sku;
          if (!productsMap.has(sku)) {
            productsMap.set(sku, {
              sku,
              name: moduleName || sku,
            });
          }
        }
        break;
      }

      case "TOP_LEVEL_HEADER": {
        // Top-level product header (No.=null, mostly empty, but has Module name)
        const name = getCell(row, colIdx.module) || getCell(row, colIdx.partName) || "";
        const pn = getCell(row, colIdx.partNumber) || "";
        const sku = pn || generateSku(name);

        if (sku) {
          currentParentSku = sku;
          if (!productsMap.has(sku)) {
            productsMap.set(sku, {
              sku,
              name: name || sku,
            });
          }
        }
        break;
      }

      case "COMPONENT": {
        if (!currentParentSku) {
          warnings.push(`Dòng ${i + 2}: Component row nhưng chưa có parent product`);
          skippedRows++;
          break;
        }

        const partNumber = getCell(row, colIdx.partNumber) || "";
        if (!partNumber) {
          skippedRows++;
          break;
        }

        const partName = getCell(row, colIdx.partName) || getCell(row, colIdx.module) || partNumber;
        const unit = getCell(row, colIdx.unit) || "pcs";
        const unitCost = getNumericCell(row, colIdx.unitCost) ?? 0;
        const quantity = getNumericCell(row, colIdx.quantity) ?? 0;
        const method = parseMethod(getCell(row, colIdx.method) || "");

        // Yield → scrapRate conversion
        let scrapRate = 0;
        const yieldVal = getNumericCell(row, colIdx.yield);
        const scrapVal = getNumericCell(row, colIdx.scrapRate);

        if (scrapVal !== null) {
          scrapRate = scrapVal > 1 ? scrapVal / 100 : scrapVal;
        } else if (yieldVal !== null) {
          if (yieldVal <= 1) {
            scrapRate = 1 - yieldVal;
          } else {
            scrapRate = (100 - yieldVal) / 100;
          }
        }

        // Category from group or method
        const groupVal = getCell(row, colIdx.group) || "";
        const category = groupVal || (method === "MAKE" ? "Tự chế tạo" : "Mua ngoài");

        // Deduplicate parts — merge with existing if already seen
        const existing = partsMap.get(partNumber);
        if (existing) {
          // Merge non-empty values
          if (!existing.name || existing.name === partNumber) existing.name = partName;
          if (unitCost > 0 && existing.unitCost === 0) existing.unitCost = unitCost;
          if (unit !== "pcs" && existing.unit === "pcs") existing.unit = unit;
        } else {
          partsMap.set(partNumber, {
            partNumber,
            name: partName,
            category,
            unit,
            unitCost,
            method,
          });
        }

        // BOM line
        if (quantity > 0) {
          bomLines.push({
            parentSku: currentParentSku,
            childPartNumber: partNumber,
            quantity,
            scrapRate,
          });
        }
        break;
      }

      case "EMPTY":
      default:
        skippedRows++;
        break;
    }
  }

  const parts = Array.from(partsMap.values());
  const products = Array.from(productsMap.values());

  return {
    isComposite: true,
    confidence: 1.0,
    parts,
    products,
    bomLines,
    stats: {
      totalRows: rows.length,
      partCount: parts.length,
      productCount: products.length,
      bomLineCount: bomLines.length,
      skippedRows,
    },
    warnings,
  };
}

// ============================================
// HELPERS
// ============================================

type RowType = "MODULE_HEADER" | "TOP_LEVEL_HEADER" | "COMPONENT" | "EMPTY";

function classifyRow(row: unknown[], colIdx: Record<string, number>): RowType {
  const noVal = getCell(row, colIdx.no);
  const groupVal = getCell(row, colIdx.group)?.toLowerCase().trim() || "";
  const moduleVal = getCell(row, colIdx.module) || "";
  const partNumberVal = getCell(row, colIdx.partNumber) || "";

  // Check if row is entirely empty
  const nonEmpty = row.filter((cell) => cell !== null && cell !== undefined && String(cell).trim() !== "");
  if (nonEmpty.length === 0) return "EMPTY";

  // Module header: No. is empty, Group = "Group"
  if ((!noVal || noVal.trim() === "") && groupVal === "group") {
    return "MODULE_HEADER";
  }

  // Component row: No. is a number
  if (noVal && !isNaN(Number(noVal))) {
    return "COMPONENT";
  }

  // Top-level header: No. is empty, has module/partName but not much else
  if ((!noVal || noVal.trim() === "") && (moduleVal || partNumberVal)) {
    // Check if this has quantity/cost → probably component with missing No.
    const qty = getNumericCell(row, colIdx.quantity);
    if (qty !== null && qty > 0) {
      return "COMPONENT";
    }
    return "TOP_LEVEL_HEADER";
  }

  return "EMPTY";
}

function findColumnIndex(normalizedHeaders: string[], field: string): number {
  const aliases = COLUMN_ALIASES[field];
  if (!aliases) return -1;

  for (let i = 0; i < normalizedHeaders.length; i++) {
    const h = normalizedHeaders[i];
    for (const alias of aliases) {
      const na = normalizeVietnamese(alias);
      if (h === na) return i;
    }
  }

  // Fallback: partial match
  for (let i = 0; i < normalizedHeaders.length; i++) {
    const h = normalizedHeaders[i];
    for (const alias of aliases) {
      const na = normalizeVietnamese(alias);
      if (na.length >= 3 && (h.includes(na) || na.includes(h))) return i;
    }
  }

  return -1;
}

function getCell(row: unknown[], idx: number): string {
  if (idx === -1 || idx >= row.length) return "";
  return String(row[idx] ?? "").trim();
}

function getNumericCell(row: unknown[], idx: number): number | null {
  if (idx === -1 || idx >= row.length) return null;
  const val = row[idx];
  if (val === null || val === undefined || String(val).trim() === "") return null;
  const num = parseFloat(String(val));
  return isNaN(num) ? null : num;
}

function parseMethod(raw: string): "MAKE" | "BUY" {
  const normalized = normalizeVietnamese(raw);
  const makePatterns = ["cnc", "tu che tao", "make", "gia cong", "self", "san xuat", "phay", "tien", "cat"];
  const buyPatterns = ["mua", "buy", "purchase", "mua trong nuoc", "mua ngoai nuoc", "import", "order"];

  for (const p of makePatterns) {
    if (normalized.includes(p)) return "MAKE";
  }
  for (const p of buyPatterns) {
    if (normalized.includes(p)) return "BUY";
  }

  return "BUY"; // default
}

function generateSku(name: string): string {
  if (!name) return "";
  // Generate SKU from name: take first letters of words, uppercase
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";

  const sku = words
    .map((w) => w.substring(0, 4).toUpperCase())
    .join("-")
    .replace(/[^A-Z0-9-]/g, "");

  return sku || name.substring(0, 20).toUpperCase().replace(/\s+/g, "-");
}
