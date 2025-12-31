// src/app/api/excel/import/process/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface ImportOptions {
  updateMode?: "insert" | "update" | "upsert";
}

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
}

// POST - Process import job
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId, data } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Get import job
    const importJob = await prisma.importJob.findUnique({
      where: { id: jobId, userId: session.user.id },
    });

    if (!importJob) {
      return NextResponse.json(
        { error: "Import job not found" },
        { status: 404 }
      );
    }

    if (importJob.status === "completed") {
      return NextResponse.json(
        { error: "Import job already completed" },
        { status: 400 }
      );
    }

    // Update job status
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: "processing",
        startedAt: new Date(),
      },
    });

    // Get mappings and options
    const mappings = (importJob.mapping || []) as unknown as ColumnMapping[];
    const options = (importJob.options || {}) as unknown as ImportOptions;
    const updateMode = options.updateMode || "insert";
    const entityType = importJob.type;

    // Process the data
    const results = await processImportData(
      data,
      entityType,
      mappings,
      updateMode
    );

    // Update job with results
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: results.errors.length > 0 ? "completed" : "completed",
        processedRows: results.processed,
        successRows: results.success,
        errorRows: results.errors.length,
        errors: results.errors as never,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      processed: results.processed,
      successCount: results.success,
      errorCount: results.errors.length,
      errors: results.errors.slice(0, 50), // Return first 50 errors
    });
  } catch (error) {
    console.error("Import process error:", error);
    return NextResponse.json(
      { error: "Import processing failed" },
      { status: 500 }
    );
  }
}

// Process import data based on entity type
async function processImportData(
  data: Record<string, unknown>[],
  entityType: string,
  mappings: ColumnMapping[],
  updateMode: string
): Promise<{
  processed: number;
  success: number;
  errors: { row: number; message: string }[];
}> {
  const errors: { row: number; message: string }[] = [];
  let success = 0;

  // Apply mappings to transform data
  const mappedData = data.map((row) => {
    const mapped: Record<string, unknown> = {};
    for (const mapping of mappings) {
      mapped[mapping.targetField] = row[mapping.sourceColumn];
    }
    return mapped;
  });

  for (let i = 0; i < mappedData.length; i++) {
    const row = mappedData[i];
    const rowNum = i + 2; // Excel row number (1-indexed + header)

    try {
      switch (entityType) {
        case "parts":
          await processPartRow(row, updateMode);
          success++;
          break;

        case "suppliers":
          await processSupplierRow(row, updateMode);
          success++;
          break;

        case "products":
          await processProductRow(row, updateMode);
          success++;
          break;

        case "customers":
          await processCustomerRow(row, updateMode);
          success++;
          break;

        case "inventory":
          await processInventoryRow(row);
          success++;
          break;

        default:
          errors.push({ row: rowNum, message: `Unknown entity type: ${entityType}` });
      }
    } catch (error) {
      errors.push({
        row: rowNum,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    processed: data.length,
    success,
    errors,
  };
}

// Helper function to parse boolean values from Excel
function parseBoolean(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  const strValue = String(value).toLowerCase().trim();
  return strValue === "true" || strValue === "yes" || strValue === "1" || strValue === "y";
}

// Process a single part row - Enhanced for Parts v2.0 with 55+ fields
async function processPartRow(
  row: Record<string, unknown>,
  updateMode: string
) {
  const partNumber = String(row.partNumber || "").trim();
  if (!partNumber) throw new Error("Part Number is required");

  // Handle supplier lookup if supplier code/name provided
  let supplierId = null;
  if (row.supplierCode || row.supplier) {
    const supplierCode = String(row.supplierCode || row.supplier).trim();
    const supplier = await prisma.supplier.findFirst({
      where: {
        OR: [
          { code: supplierCode },
          { name: { contains: supplierCode, mode: "insensitive" } },
        ],
      },
    });
    if (supplier) supplierId = supplier.id;
  }

  const data = {
    partNumber,
    name: String(row.name || "").trim(),
    category: row.category ? String(row.category).trim() : "General",
    subCategory: row.subCategory ? String(row.subCategory).trim() : null,
    partType: row.partType ? String(row.partType).trim() : null,
    description: row.description ? String(row.description).trim() : null,
    unit: row.unit ? String(row.unit).trim() : "pcs",
    unitCost: row.unitCost ? Number(row.unitCost) : 0,
    supplierId,

    // Physical Specifications
    weightKg: row.weightKg || row.weight ? Number(row.weightKg || row.weight) : null,
    lengthMm: row.lengthMm || row.length ? Number(row.lengthMm || row.length) : null,
    widthMm: row.widthMm || row.width ? Number(row.widthMm || row.width) : null,
    heightMm: row.heightMm || row.height ? Number(row.heightMm || row.height) : null,
    volumeCm3: row.volumeCm3 || row.volume ? Number(row.volumeCm3 || row.volume) : null,
    color: row.color ? String(row.color).trim() : null,
    material: row.material ? String(row.material).trim() : null,

    // Procurement & Sourcing
    makeOrBuy: row.makeOrBuy ? String(row.makeOrBuy).toUpperCase() as "MAKE" | "BUY" | "BOTH" : "BUY",
    procurementType: row.procurementType ? String(row.procurementType).toUpperCase() as "STOCK" | "ORDER" | "CONSIGNMENT" : "STOCK",
    buyerCode: row.buyerCode ? String(row.buyerCode).trim() : null,
    moq: row.moq ? Number(row.moq) : 1,
    orderMultiple: row.orderMultiple ? Number(row.orderMultiple) : 1,
    standardPack: row.standardPack ? Number(row.standardPack) : 1,
    leadTimeDays: row.leadTimeDays || row.leadTime ? Number(row.leadTimeDays || row.leadTime) : 0,

    // Inventory Planning
    minStockLevel: row.minStockLevel || row.minStock ? Number(row.minStockLevel || row.minStock) : 0,
    reorderPoint: row.reorderPoint ? Number(row.reorderPoint) : 0,
    maxStock: row.maxStock ? Number(row.maxStock) : null,
    safetyStock: row.safetyStock ? Number(row.safetyStock) : 0,
    isCritical: parseBoolean(row.isCritical || row.critical, false),

    // Compliance & Origin
    countryOfOrigin: row.countryOfOrigin || row.origin ? String(row.countryOfOrigin || row.origin).trim() : null,
    hsCode: row.hsCode ? String(row.hsCode).trim() : null,
    eccn: row.eccn ? String(row.eccn).trim() : null,
    ndaaCompliant: parseBoolean(row.ndaaCompliant || row.ndaa, true),
    itarControlled: parseBoolean(row.itarControlled || row.itar, false),

    // Quality & Traceability
    lotControl: parseBoolean(row.lotControl, false),
    serialControl: parseBoolean(row.serialControl, false),
    shelfLifeDays: row.shelfLifeDays || row.shelfLife ? Number(row.shelfLifeDays || row.shelfLife) : null,
    inspectionRequired: parseBoolean(row.inspectionRequired, true),
    inspectionPlan: row.inspectionPlan ? String(row.inspectionPlan).trim() : null,
    aqlLevel: row.aqlLevel ? String(row.aqlLevel).trim() : null,
    certificateRequired: parseBoolean(row.certificateRequired, false),
    rohsCompliant: parseBoolean(row.rohsCompliant || row.rohs, true),
    reachCompliant: parseBoolean(row.reachCompliant || row.reach, true),

    // Engineering & Documents
    revision: row.revision ? String(row.revision).trim() : "A",
    revisionDate: row.revisionDate ? new Date(String(row.revisionDate)) : null,
    drawingNumber: row.drawingNumber || row.drawing ? String(row.drawingNumber || row.drawing).trim() : null,
    drawingUrl: row.drawingUrl ? String(row.drawingUrl).trim() : null,
    datasheetUrl: row.datasheetUrl ? String(row.datasheetUrl).trim() : null,
    specDocument: row.specDocument ? String(row.specDocument).trim() : null,
    manufacturerPn: row.manufacturerPn || row.mfrPn ? String(row.manufacturerPn || row.mfrPn).trim() : null,
    manufacturer: row.manufacturer || row.mfr ? String(row.manufacturer || row.mfr).trim() : null,
    lifecycleStatus: row.lifecycleStatus ? String(row.lifecycleStatus).toUpperCase() as "DEVELOPMENT" | "PROTOTYPE" | "ACTIVE" | "PHASE_OUT" | "OBSOLETE" | "EOL" : "ACTIVE",
    effectivityDate: row.effectivityDate ? new Date(String(row.effectivityDate)) : null,
    obsoleteDate: row.obsoleteDate ? new Date(String(row.obsoleteDate)) : null,

    // Enhanced Costing
    standardCost: row.standardCost ? Number(row.standardCost) : null,
    averageCost: row.averageCost ? Number(row.averageCost) : null,
    landedCost: row.landedCost ? Number(row.landedCost) : null,
    freightPercent: row.freightPercent ? Number(row.freightPercent) : null,
    dutyPercent: row.dutyPercent ? Number(row.dutyPercent) : null,
    overheadPercent: row.overheadPercent ? Number(row.overheadPercent) : null,

    // Price Breaks
    priceBreakQty1: row.priceBreakQty1 ? Number(row.priceBreakQty1) : null,
    priceBreakCost1: row.priceBreakCost1 ? Number(row.priceBreakCost1) : null,
    priceBreakQty2: row.priceBreakQty2 ? Number(row.priceBreakQty2) : null,
    priceBreakCost2: row.priceBreakCost2 ? Number(row.priceBreakCost2) : null,
    priceBreakQty3: row.priceBreakQty3 ? Number(row.priceBreakQty3) : null,
    priceBreakCost3: row.priceBreakCost3 ? Number(row.priceBreakCost3) : null,

    // Additional
    tags: row.tags ? (Array.isArray(row.tags) ? row.tags : String(row.tags).split(",").map(t => t.trim())) : [],
    status: row.status ? String(row.status).toLowerCase() : "active",
  };

  if (updateMode === "insert") {
    await prisma.part.create({ data });
  } else if (updateMode === "update") {
    await prisma.part.update({
      where: { partNumber },
      data,
    });
  } else {
    // upsert
    await prisma.part.upsert({
      where: { partNumber },
      create: data,
      update: data,
    });
  }
}

// Process a single supplier row - Enhanced with new compliance fields
async function processSupplierRow(
  row: Record<string, unknown>,
  updateMode: string
) {
  const code = String(row.code || "").trim();
  if (!code) throw new Error("Supplier Code is required");

  const data = {
    code,
    name: String(row.name || "").trim(),
    country: row.country ? String(row.country).trim() : "Unknown",
    contactName: row.contactName ? String(row.contactName).trim() : null,
    contactEmail: row.contactEmail ? String(row.contactEmail).trim() : null,
    contactPhone: row.contactPhone ? String(row.contactPhone).trim() : null,
    address: row.address ? String(row.address).trim() : null,
    website: row.website ? String(row.website).trim() : null,
    paymentTerms: row.paymentTerms ? String(row.paymentTerms).trim() : null,
    leadTimeDays: row.leadTimeDays ? Number(row.leadTimeDays) : 14,
    rating: row.rating ? Number(row.rating) : null,
    category: row.category ? String(row.category).trim() : null,
    minOrderValue: row.minOrderValue ? Number(row.minOrderValue) : null,
    // Compliance fields
    ndaaCompliant: parseBoolean(row.ndaaCompliant || row.ndaa, true),
    itarRegistered: parseBoolean(row.itarRegistered || row.itar, false),
    as9100Certified: parseBoolean(row.as9100Certified || row.as9100, false),
    iso9001Certified: parseBoolean(row.iso9001Certified || row.iso9001, false),
    status: row.status ? String(row.status).toLowerCase() : "active",
  };

  if (updateMode === "insert") {
    await prisma.supplier.create({ data });
  } else if (updateMode === "update") {
    await prisma.supplier.update({
      where: { code },
      data,
    });
  } else {
    await prisma.supplier.upsert({
      where: { code },
      create: data,
      update: data,
    });
  }
}

// Process a single product row
async function processProductRow(
  row: Record<string, unknown>,
  updateMode: string
) {
  const sku = String(row.sku || "").trim();
  if (!sku) throw new Error("SKU is required");

  const data = {
    sku,
    name: String(row.name || "").trim(),
    description: row.description ? String(row.description).trim() : null,
    basePrice: row.basePrice ? Number(row.basePrice) : null,
    assemblyHours: row.assemblyHours ? Number(row.assemblyHours) : null,
    testingHours: row.testingHours ? Number(row.testingHours) : null,
    status: row.status ? String(row.status).toLowerCase() : "active",
  };

  if (updateMode === "insert") {
    await prisma.product.create({ data });
  } else if (updateMode === "update") {
    await prisma.product.update({
      where: { sku },
      data,
    });
  } else {
    await prisma.product.upsert({
      where: { sku },
      create: data,
      update: data,
    });
  }
}

// Process a single customer row
async function processCustomerRow(
  row: Record<string, unknown>,
  updateMode: string
) {
  const code = String(row.code || "").trim();
  if (!code) throw new Error("Customer Code is required");

  const data = {
    code,
    name: String(row.name || "").trim(),
    type: row.type ? String(row.type).trim() : null,
    country: row.country ? String(row.country).trim() : null,
    contactName: row.contactName ? String(row.contactName).trim() : null,
    contactEmail: row.contactEmail ? String(row.contactEmail).trim() : null,
    contactPhone: row.contactPhone ? String(row.contactPhone).trim() : null,
    billingAddress: row.billingAddress ? String(row.billingAddress).trim() : null,
    paymentTerms: row.paymentTerms ? String(row.paymentTerms).trim() : null,
    creditLimit: row.creditLimit ? Number(row.creditLimit) : null,
    status: row.status ? String(row.status).toLowerCase() : "active",
  };

  if (updateMode === "insert") {
    await prisma.customer.create({ data });
  } else if (updateMode === "update") {
    await prisma.customer.update({
      where: { code },
      data,
    });
  } else {
    await prisma.customer.upsert({
      where: { code },
      create: data,
      update: data,
    });
  }
}

// Process a single inventory row
async function processInventoryRow(
  row: Record<string, unknown>
) {
  const partNumber = String(row.partNumber || "").trim();
  const warehouseCode = String(row.warehouseCode || row.warehouse || "").trim();

  if (!partNumber) throw new Error("Part Number is required");
  if (!warehouseCode) throw new Error("Warehouse is required");

  // Find part
  const part = await prisma.part.findUnique({
    where: { partNumber },
  });
  if (!part) throw new Error(`Part not found: ${partNumber}`);

  // Find warehouse
  const warehouse = await prisma.warehouse.findUnique({
    where: { code: warehouseCode },
  });
  if (!warehouse) throw new Error(`Warehouse not found: ${warehouseCode}`);

  const lotNumber = row.lotNumber ? String(row.lotNumber).trim() : null;

  const data = {
    partId: part.id,
    warehouseId: warehouse.id,
    quantity: row.quantity ? Number(row.quantity) : 0,
    reservedQty: row.reservedQty ? Number(row.reservedQty) : 0,
    lotNumber,
    locationCode: row.locationCode ? String(row.locationCode).trim() : null,
    expiryDate: row.expiryDate ? new Date(String(row.expiryDate)) : null,
  };

  // Use upsert for inventory
  await prisma.inventory.upsert({
    where: {
      partId_warehouseId_lotNumber: {
        partId: part.id,
        warehouseId: warehouse.id,
        lotNumber: lotNumber || "",
      },
    },
    create: {
      ...data,
      lotNumber: lotNumber || undefined,
    },
    update: {
      quantity: data.quantity,
      reservedQty: data.reservedQty,
      locationCode: data.locationCode,
      expiryDate: data.expiryDate,
    },
  });
}
