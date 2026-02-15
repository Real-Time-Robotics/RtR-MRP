// src/lib/import/import-executor.ts
// Batch import executor — adapted to actual Prisma schema

import prisma from "@/lib/prisma";
import { ColumnMapping } from "./ai-analyzer";

interface ImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: { row: number; message: string }[];
}

export async function executeImport(
  sessionId: string,
  data: unknown[][],
  columns: ColumnMapping[],
  targetType: string,
  userId: string,
  options: {
    skipDuplicates?: boolean;
    updateExisting?: boolean;
  } = {}
): Promise<ImportResult> {
  const { skipDuplicates = true, updateExisting = false } = options;

  // Update session status
  await prisma.importSession.update({
    where: { id: sessionId },
    data: { status: "IMPORTING" },
  });

  const errors: { row: number; message: string }[] = [];
  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  // Build field mapping: fieldName → excelColumnIndex
  const fieldMap: Record<string, number> = {};
  for (const col of columns) {
    if (col.mappedTo) {
      fieldMap[col.mappedTo] = col.excelIndex;
    }
  }

  // Process rows
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2; // +2 for header and 0-index

    try {
      switch (targetType) {
        case "PARTS":
          await importPart(row, fieldMap, updateExisting, skipDuplicates);
          break;
        case "SUPPLIERS":
          await importSupplier(row, fieldMap, updateExisting, skipDuplicates);
          break;
        case "BOM":
          await importBom(row, fieldMap);
          break;
        case "INVENTORY":
          await importInventory(row, fieldMap);
          break;
        default:
          throw new Error(`Unsupported import type: ${targetType}`);
      }
      successCount++;
    } catch (error) {
      if (error instanceof Error && error.message.includes("SKIP")) {
        skippedCount++;
      } else {
        failedCount++;
        errors.push({
          row: rowNum,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  // Update session
  await prisma.importSession.update({
    where: { id: sessionId },
    data: {
      status: failedCount > 0 ? "COMPLETED" : "COMPLETED",
      successRows: successCount,
      failedRows: failedCount,
      skippedRows: skippedCount,
      validationErrors: errors.length > 0 ? (errors as unknown as object[]) : undefined,
      completedAt: new Date(),
    },
  });

  return {
    success: failedCount === 0,
    totalRows: data.length,
    successCount,
    failedCount,
    skippedCount,
    errors,
  };
}

// ======== PARTS IMPORT ========

function getStringVal(row: unknown[], fieldMap: Record<string, number>, field: string): string {
  if (fieldMap[field] === undefined) return "";
  return String(row[fieldMap[field]] || "").trim();
}

function getFloatVal(row: unknown[], fieldMap: Record<string, number>, field: string): number | undefined {
  if (fieldMap[field] === undefined) return undefined;
  const val = parseFloat(String(row[fieldMap[field]] || ""));
  return isNaN(val) ? undefined : val;
}

function getIntVal(row: unknown[], fieldMap: Record<string, number>, field: string): number | undefined {
  if (fieldMap[field] === undefined) return undefined;
  const val = parseInt(String(row[fieldMap[field]] || ""), 10);
  return isNaN(val) ? undefined : val;
}

async function importPart(
  row: unknown[],
  fieldMap: Record<string, number>,
  updateExisting: boolean,
  skipDuplicates: boolean
) {
  const partNumber = getStringVal(row, fieldMap, "partNumber");
  if (!partNumber) throw new Error("Mã sản phẩm trống");

  const existing = await prisma.part.findFirst({ where: { partNumber } });

  if (existing) {
    if (skipDuplicates && !updateExisting) {
      throw new Error("SKIP: Đã tồn tại");
    }
    if (updateExisting) {
      await prisma.part.update({
        where: { id: existing.id },
        data: buildPartData(row, fieldMap),
      });
      return;
    }
  }

  await prisma.part.create({
    data: {
      partNumber,
      name: getStringVal(row, fieldMap, "name") || partNumber,
      category: getStringVal(row, fieldMap, "category") || "Imported",
      ...buildPartData(row, fieldMap),
    },
  });
}

function buildPartData(row: unknown[], fieldMap: Record<string, number>) {
  const data: Record<string, unknown> = {};

  const name = getStringVal(row, fieldMap, "name");
  if (name) data.name = name;

  const category = getStringVal(row, fieldMap, "category");
  if (category) data.category = category;

  const unit = getStringVal(row, fieldMap, "unit");
  if (unit) data.unit = unit;

  const unitCost = getFloatVal(row, fieldMap, "unitCost");
  if (unitCost !== undefined) data.unitCost = unitCost;

  const reorderPoint = getIntVal(row, fieldMap, "reorderPoint");
  if (reorderPoint !== undefined) data.reorderPoint = reorderPoint;

  // Schema uses leadTimeDays not leadTime
  const leadTime = getIntVal(row, fieldMap, "leadTime");
  if (leadTime !== undefined) data.leadTimeDays = leadTime;

  const moq = getIntVal(row, fieldMap, "moq");
  if (moq !== undefined) data.moq = moq;

  const weight = getFloatVal(row, fieldMap, "weight");
  if (weight !== undefined) data.weightKg = weight;

  const notes = getStringVal(row, fieldMap, "notes");
  if (notes) data.notes = notes;

  return data;
}

// ======== SUPPLIERS IMPORT ========

async function importSupplier(
  row: unknown[],
  fieldMap: Record<string, number>,
  updateExisting: boolean,
  skipDuplicates: boolean
) {
  const name = getStringVal(row, fieldMap, "supplierName");
  if (!name) throw new Error("Tên NCC trống");

  const existing = await prisma.supplier.findFirst({ where: { name } });

  if (existing) {
    if (skipDuplicates && !updateExisting) {
      throw new Error("SKIP: Đã tồn tại");
    }
    if (updateExisting) {
      await prisma.supplier.update({
        where: { id: existing.id },
        data: buildSupplierData(row, fieldMap),
      });
      return;
    }
  }

  // Supplier requires code (unique) and country
  const code =
    getStringVal(row, fieldMap, "supplierCode") ||
    `SUP-${Date.now().toString(36).toUpperCase()}`;

  await prisma.supplier.create({
    data: {
      name,
      code,
      country: "VN",
      leadTimeDays: getIntVal(row, fieldMap, "leadTime") ?? 14,
      ...buildSupplierData(row, fieldMap),
    },
  });
}

function buildSupplierData(row: unknown[], fieldMap: Record<string, number>) {
  const data: Record<string, unknown> = {};

  const contactName = getStringVal(row, fieldMap, "contactName");
  if (contactName) data.contactName = contactName;

  // Schema uses contactPhone, contactEmail
  const phone = getStringVal(row, fieldMap, "phone");
  if (phone) data.contactPhone = phone;

  const email = getStringVal(row, fieldMap, "email");
  if (email) data.contactEmail = email;

  const address = getStringVal(row, fieldMap, "address");
  if (address) data.address = address;

  const taxId = getStringVal(row, fieldMap, "taxId");
  if (taxId) data.taxId = taxId;

  const paymentTerms = getStringVal(row, fieldMap, "paymentTerms");
  if (paymentTerms) data.paymentTerms = paymentTerms;

  return data;
}

// ======== BOM IMPORT ========

async function importBom(row: unknown[], fieldMap: Record<string, number>) {
  const parentPartNumber = getStringVal(row, fieldMap, "parentPart");
  const childPartNumber = getStringVal(row, fieldMap, "childPart");
  const quantity = getFloatVal(row, fieldMap, "bomQuantity") ?? 0;

  if (!parentPartNumber) throw new Error("Mã SP cha trống");
  if (!childPartNumber) throw new Error("Mã linh kiện trống");
  if (quantity <= 0) throw new Error("Số lượng không hợp lệ");

  // Find parent product (BomHeader links to Product, not Part)
  const product = await prisma.product.findFirst({
    where: { sku: parentPartNumber },
  });
  if (!product)
    throw new Error(`Không tìm thấy sản phẩm cha: ${parentPartNumber}`);

  // Find child part
  const childPart = await prisma.part.findFirst({
    where: { partNumber: childPartNumber },
  });
  if (!childPart)
    throw new Error(`Không tìm thấy linh kiện: ${childPartNumber}`);

  // Find or create BomHeader
  let bomHeader = await prisma.bomHeader.findFirst({
    where: { productId: product.id, status: "active" },
    include: { bomLines: true },
  });

  if (!bomHeader) {
    bomHeader = await prisma.bomHeader.create({
      data: {
        productId: product.id,
        version: "1.0",
        effectiveDate: new Date(),
        status: "active",
      },
      include: { bomLines: true },
    });
  }

  // Check if BOM line already exists for this child part
  const existingLine = bomHeader.bomLines.find(
    (line) => line.partId === childPart.id
  );

  if (existingLine) {
    await prisma.bomLine.update({
      where: { id: existingLine.id },
      data: {
        quantity,
        scrapRate:
          getFloatVal(row, fieldMap, "scrapRate") ?? existingLine.scrapRate,
      },
    });
  } else {
    // Calculate next line number
    const maxLineNumber = bomHeader.bomLines.reduce(
      (max, line) => Math.max(max, line.lineNumber),
      0
    );

    await prisma.bomLine.create({
      data: {
        bomId: bomHeader.id,
        lineNumber: maxLineNumber + 1,
        partId: childPart.id,
        quantity,
        scrapRate: getFloatVal(row, fieldMap, "scrapRate") ?? 0,
      },
    });
  }
}

// ======== INVENTORY IMPORT ========

async function importInventory(
  row: unknown[],
  fieldMap: Record<string, number>
) {
  const partNumber = getStringVal(row, fieldMap, "partNumber");
  const quantity = getFloatVal(row, fieldMap, "quantityOnHand") ?? 0;

  if (!partNumber) throw new Error("Mã sản phẩm trống");

  const part = await prisma.part.findFirst({ where: { partNumber } });
  if (!part) throw new Error(`Không tìm thấy SP: ${partNumber}`);

  // Get warehouse
  let warehouse;
  const whCode = getStringVal(row, fieldMap, "warehouse");
  if (whCode) {
    warehouse = await prisma.warehouse.findFirst({
      where: { code: whCode },
    });
  }
  if (!warehouse) {
    warehouse = await prisma.warehouse.findFirst({
      where: { type: "MAIN" },
    });
  }
  if (!warehouse) throw new Error("Không tìm thấy kho");

  const lotNumber = getStringVal(row, fieldMap, "lotNumber") || "";

  // Upsert inventory
  await prisma.inventory.upsert({
    where: {
      partId_warehouseId_lotNumber: {
        partId: part.id,
        warehouseId: warehouse.id,
        lotNumber,
      },
    },
    create: {
      partId: part.id,
      warehouseId: warehouse.id,
      lotNumber,
      quantity: Math.round(quantity),
    },
    update: {
      quantity: Math.round(quantity),
    },
  });
}
