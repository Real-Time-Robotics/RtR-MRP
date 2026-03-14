// src/lib/jobs/handlers.ts
// Background job handlers for heavy operations

import { jobQueue, JOB_NAMES, Job, JobHandler } from "./job-queue";
import { warmAllCaches } from "@/lib/cache/cache-warmer";
// Note: Redis cache disabled - not available on Render free tier
import prisma from "@/lib/prisma";
import { logger } from "@/lib/monitoring/logger";

// ============================================
// CACHE WARMING JOB
// ============================================

interface CacheWarmingData {
  type?: "all" | "dashboard" | "workOrders" | "salesOrders" | "parts";
}

const cacheWarmingHandler: JobHandler<CacheWarmingData> = async (job, updateProgress) => {
  updateProgress(10);

  const report = await warmAllCaches();

  updateProgress(100);

  return report;
};

// ============================================
// SYSTEM CLEANUP JOB
// ============================================

interface CleanupData {
  olderThanDays?: number;
}

const cleanupHandler: JobHandler<CleanupData> = async (job, updateProgress) => {
  const { olderThanDays = 30 } = job.data;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  updateProgress(10);

  // Clear old cache entries
  const clearedFromQueue = jobQueue.clear(olderThanDays * 24 * 60 * 60 * 1000);
  updateProgress(30);

  // Clear old audit logs (if any)
  let deletedAuditLogs = 0;
  try {
    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });
    deletedAuditLogs = result.count;
  } catch {
    // Table might not exist
  }
  updateProgress(60);

  // Clear old notifications
  let deletedNotifications = 0;
  try {
    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });
    deletedNotifications = result.count;
  } catch {
    // Table might not exist
  }
  updateProgress(100);

  return {
    clearedJobs: clearedFromQueue,
    deletedAuditLogs,
    deletedNotifications,
    cutoffDate: cutoffDate.toISOString(),
  };
};

// ============================================
// REPORT GENERATION JOB
// ============================================

interface ReportData {
  type: "inventory" | "sales" | "production" | "financial";
  format: "json" | "csv";
  dateRange?: {
    start: string;
    end: string;
  };
}

const reportGenerationHandler: JobHandler<ReportData> = async (job, updateProgress) => {
  const { type, format, dateRange } = job.data;

  updateProgress(10);

  let data: unknown[] = [];

  switch (type) {
    case "inventory":
      data = await prisma.inventory.findMany({
        include: {
          part: { select: { partNumber: true, name: true } },
        },
      });
      break;

    case "sales":
      const salesWhere = dateRange
        ? {
          orderDate: {
            gte: new Date(dateRange.start),
            lte: new Date(dateRange.end),
          },
        }
        : {};
      data = await prisma.salesOrder.findMany({
        where: salesWhere,
        include: {
          customer: { select: { name: true } },
          lines: {
            include: { product: { select: { name: true, sku: true } } },
          },
        },
      });
      break;

    case "production":
      const prodWhere = dateRange
        ? {
          createdAt: {
            gte: new Date(dateRange.start),
            lte: new Date(dateRange.end),
          },
        }
        : {};
      data = await prisma.workOrder.findMany({
        where: prodWhere,
        include: {
          product: { select: { name: true, sku: true } },
        },
      });
      break;

    case "financial":
      // Simplified financial report
      const [salesTotal, poTotal] = await Promise.all([
        prisma.salesOrder.aggregate({ _sum: { totalAmount: true } }),
        prisma.purchaseOrder.aggregate({ _sum: { totalAmount: true } }),
      ]);
      data = [
        {
          totalSales: salesTotal._sum.totalAmount || 0,
          totalPurchases: poTotal._sum.totalAmount || 0,
          generatedAt: new Date().toISOString(),
        },
      ];
      break;
  }

  updateProgress(70);

  // Format data
  let result: string;
  if (format === "csv") {
    // Simple CSV conversion
    if (data.length === 0) {
      result = "";
    } else {
      const headers = Object.keys(data[0] as Record<string, unknown>);
      const rows = data.map((item) =>
        headers.map((h) => JSON.stringify((item as Record<string, unknown>)[h] ?? "")).join(",")
      );
      result = [headers.join(","), ...rows].join("\n");
    }
  } else {
    result = JSON.stringify(data, null, 2);
  }

  updateProgress(100);

  return {
    type,
    format,
    recordCount: data.length,
    generatedAt: new Date().toISOString(),
    data: result,
  };
};

// ============================================
// DATA SYNC JOB
// ============================================

interface DataSyncData {
  entityType: "inventory" | "prices" | "all";
}

const dataSyncHandler: JobHandler<DataSyncData> = async (job, updateProgress) => {
  const { entityType } = job.data;
  const results: Record<string, number> = {};

  updateProgress(10);

  if (entityType === "inventory" || entityType === "all") {
    // Recalculate inventory levels
    const inventoryCount = await prisma.inventory.count();
    results.inventoryRecords = inventoryCount;
    updateProgress(40);
  }

  if (entityType === "prices" || entityType === "all") {
    // Update average costs based on recent PO prices
    const partsWithPO = await prisma.purchaseOrderLine.groupBy({
      by: ["partId"],
      _avg: { unitPrice: true },
    });

    for (const item of partsWithPO) {
      if (item.partId && item._avg.unitPrice) {
        await prisma.part.update({
          where: { id: item.partId },
          data: {
            costs: {
              deleteMany: {},
              create: {
                averageCost: item._avg.unitPrice,
                unitCost: item._avg.unitPrice,
              }
            }
          },
        });
      }
    }

    results.pricesUpdated = partsWithPO.length;
    updateProgress(80);
  }

  // Note: Cache invalidation disabled - Redis not available on Render free tier

  updateProgress(100);

  return {
    entityType,
    results,
    syncedAt: new Date().toISOString(),
  };
};

// ============================================
// EXCEL IMPORT JOB
// ============================================

interface ExcelImportData {
  jobId: string;
  data: Record<string, unknown>[];
  entityType: string;
  mappings: { sourceColumn: string; targetField: string }[];
  updateMode: "insert" | "update" | "upsert";
}

function parseBoolean(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  const strValue = String(value).toLowerCase().trim();
  return strValue === "true" || strValue === "yes" || strValue === "1" || strValue === "y";
}

const excelImportHandler: JobHandler<ExcelImportData> = async (job, updateProgress) => {
  const { jobId, data, entityType, mappings, updateMode } = job.data;

  updateProgress(5);

  // Update import job status to processing
  await prisma.importJob.update({
    where: { id: jobId },
    data: { status: "processing", startedAt: new Date() },
  });

  // Apply mappings to transform data
  const mappedData = data.map((row) => {
    const mapped: Record<string, unknown> = {};
    for (const mapping of mappings) {
      mapped[mapping.targetField] = row[mapping.sourceColumn];
    }
    return mapped;
  });

  updateProgress(10);

  const errors: { row: number; message: string }[] = [];
  let success = 0;
  const total = mappedData.length;

  for (let i = 0; i < total; i++) {
    const row = mappedData[i];
    const rowNum = i + 2; // Excel row (1-indexed + header)

    try {
      switch (entityType) {
        case "parts":
          await processPartImportRow(row, updateMode);
          success++;
          break;
        case "suppliers":
          await processSupplierImportRow(row, updateMode);
          success++;
          break;
        case "products":
          await processProductImportRow(row, updateMode);
          success++;
          break;
        case "customers":
          await processCustomerImportRow(row, updateMode);
          success++;
          break;
        case "inventory":
          await processInventoryImportRow(row);
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

    // Update progress every 10% or every 50 rows
    if (i % Math.max(1, Math.floor(total / 10)) === 0 || i % 50 === 0) {
      updateProgress(10 + Math.round((i / total) * 80));
    }
  }

  updateProgress(95);

  // Update import job with results
  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: "completed",
      processedRows: total,
      successRows: success,
      errorRows: errors.length,
      errors: errors as never,
      completedAt: new Date(),
    },
  });

  updateProgress(100);

  return { processed: total, success, errorCount: errors.length, errors: errors.slice(0, 50) };
};

// --- Import row processors (extracted from /api/excel/import/process) ---

async function processPartImportRow(row: Record<string, unknown>, updateMode: string) {
  const partNumber = String(row.partNumber || "").trim();
  if (!partNumber) throw new Error("Part Number is required");

  let supplierId = null;
  if (row.supplierCode || row.supplier) {
    const supplierCode = String(row.supplierCode || row.supplier).trim();
    const supplier = await prisma.supplier.findFirst({
      where: { OR: [{ code: supplierCode }, { name: { contains: supplierCode, mode: "insensitive" } }] },
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
    weightKg: row.weightKg || row.weight ? Number(row.weightKg || row.weight) : null,
    lengthMm: row.lengthMm || row.length ? Number(row.lengthMm || row.length) : null,
    widthMm: row.widthMm || row.width ? Number(row.widthMm || row.width) : null,
    heightMm: row.heightMm || row.height ? Number(row.heightMm || row.height) : null,
    volumeCm3: row.volumeCm3 || row.volume ? Number(row.volumeCm3 || row.volume) : null,
    color: row.color ? String(row.color).trim() : null,
    material: row.material ? String(row.material).trim() : null,
    makeOrBuy: row.makeOrBuy ? (String(row.makeOrBuy).toUpperCase() as "MAKE" | "BUY" | "BOTH") : "BUY",
    procurementType: row.procurementType ? (String(row.procurementType).toUpperCase() as "STOCK" | "ORDER" | "CONSIGNMENT") : "STOCK",
    buyerCode: row.buyerCode ? String(row.buyerCode).trim() : null,
    moq: row.moq ? Number(row.moq) : 1,
    orderMultiple: row.orderMultiple ? Number(row.orderMultiple) : 1,
    standardPack: row.standardPack ? Number(row.standardPack) : 1,
    leadTimeDays: row.leadTimeDays || row.leadTime ? Number(row.leadTimeDays || row.leadTime) : 0,
    minStockLevel: row.minStockLevel || row.minStock ? Number(row.minStockLevel || row.minStock) : 0,
    reorderPoint: row.reorderPoint ? Number(row.reorderPoint) : 0,
    maxStock: row.maxStock ? Number(row.maxStock) : null,
    safetyStock: row.safetyStock ? Number(row.safetyStock) : 0,
    isCritical: parseBoolean(row.isCritical || row.critical, false),
    countryOfOrigin: row.countryOfOrigin || row.origin ? String(row.countryOfOrigin || row.origin).trim() : null,
    hsCode: row.hsCode ? String(row.hsCode).trim() : null,
    eccn: row.eccn ? String(row.eccn).trim() : null,
    ndaaCompliant: parseBoolean(row.ndaaCompliant || row.ndaa, true),
    itarControlled: parseBoolean(row.itarControlled || row.itar, false),
    lotControl: parseBoolean(row.lotControl, false),
    serialControl: parseBoolean(row.serialControl, false),
    shelfLifeDays: row.shelfLifeDays || row.shelfLife ? Number(row.shelfLifeDays || row.shelfLife) : null,
    inspectionRequired: parseBoolean(row.inspectionRequired, true),
    rohsCompliant: parseBoolean(row.rohsCompliant || row.rohs, true),
    reachCompliant: parseBoolean(row.reachCompliant || row.reach, true),
    revision: row.revision ? String(row.revision).trim() : "A",
    lifecycleStatus: row.lifecycleStatus ? (String(row.lifecycleStatus).toUpperCase() as "DEVELOPMENT" | "PROTOTYPE" | "ACTIVE" | "PHASE_OUT" | "OBSOLETE" | "EOL") : "ACTIVE",
    tags: row.tags ? (Array.isArray(row.tags) ? row.tags : String(row.tags).split(",").map((t: string) => t.trim())) : [],
    status: row.status ? String(row.status).toLowerCase() : "active",
  };

  if (updateMode === "insert") {
    await prisma.part.create({ data });
  } else if (updateMode === "update") {
    await prisma.part.update({ where: { partNumber }, data });
  } else {
    await prisma.part.upsert({ where: { partNumber }, create: data, update: data });
  }
}

async function processSupplierImportRow(row: Record<string, unknown>, updateMode: string) {
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
    ndaaCompliant: parseBoolean(row.ndaaCompliant || row.ndaa, true),
    itarRegistered: parseBoolean(row.itarRegistered || row.itar, false),
    as9100Certified: parseBoolean(row.as9100Certified || row.as9100, false),
    iso9001Certified: parseBoolean(row.iso9001Certified || row.iso9001, false),
    status: row.status ? String(row.status).toLowerCase() : "active",
  };

  if (updateMode === "insert") {
    await prisma.supplier.create({ data });
  } else if (updateMode === "update") {
    await prisma.supplier.update({ where: { code }, data });
  } else {
    await prisma.supplier.upsert({ where: { code }, create: data, update: data });
  }
}

async function processProductImportRow(row: Record<string, unknown>, updateMode: string) {
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
    await prisma.product.update({ where: { sku }, data });
  } else {
    await prisma.product.upsert({ where: { sku }, create: data, update: data });
  }
}

async function processCustomerImportRow(row: Record<string, unknown>, updateMode: string) {
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
    creditLimit: row.creditLimit ? Number(row.creditLimit) : 0,
    status: row.status ? String(row.status).toLowerCase() : "active",
  };

  if (updateMode === "insert") {
    await prisma.customer.create({ data });
  } else if (updateMode === "update") {
    await prisma.customer.update({ where: { code }, data });
  } else {
    await prisma.customer.upsert({ where: { code }, create: data, update: data });
  }
}

async function processInventoryImportRow(row: Record<string, unknown>) {
  const partNumber = String(row.partNumber || "").trim();
  const warehouseCode = String(row.warehouseCode || row.warehouse || "").trim();
  if (!partNumber) throw new Error("Part Number is required");
  if (!warehouseCode) throw new Error("Warehouse is required");

  const part = await prisma.part.findUnique({ where: { partNumber } });
  if (!part) throw new Error(`Part not found: ${partNumber}`);

  const warehouse = await prisma.warehouse.findUnique({ where: { code: warehouseCode } });
  if (!warehouse) throw new Error(`Warehouse not found: ${warehouseCode}`);

  const lotNumber = row.lotNumber ? String(row.lotNumber).trim() : null;

  await prisma.inventory.upsert({
    where: {
      partId_warehouseId_lotNumber: {
        partId: part.id,
        warehouseId: warehouse.id,
        lotNumber: lotNumber || "",
      },
    },
    create: {
      partId: part.id,
      warehouseId: warehouse.id,
      quantity: row.quantity ? Number(row.quantity) : 0,
      reservedQty: row.reservedQty ? Number(row.reservedQty) : 0,
      lotNumber: lotNumber || undefined,
      locationCode: row.locationCode ? String(row.locationCode).trim() : null,
      expiryDate: row.expiryDate ? new Date(String(row.expiryDate)) : null,
    },
    update: {
      quantity: row.quantity ? Number(row.quantity) : 0,
      reservedQty: row.reservedQty ? Number(row.reservedQty) : 0,
      locationCode: row.locationCode ? String(row.locationCode).trim() : null,
      expiryDate: row.expiryDate ? new Date(String(row.expiryDate)) : null,
    },
  });
}

// ============================================
// MRP CALCULATION JOB
// ============================================

interface MRPCalcData {
  orderIds: string[];
  options?: {
    includeSafetyStock?: boolean;
    planningHorizon?: number;
  };
}

const mrpCalculateHandler: JobHandler<MRPCalcData> = async (job, updateProgress) => {
  const { orderIds, options } = job.data;
  const includeSafetyStock = options?.includeSafetyStock !== false;
  const planningHorizon = options?.planningHorizon || 30;

  updateProgress(5);

  // Step 1: Get sales orders with items
  const salesOrders = await prisma.salesOrder.findMany({
    where: { id: { in: orderIds } },
    include: {
      lines: { include: { product: true } },
      customer: true,
    },
  });

  if (salesOrders.length === 0) {
    throw new Error("No valid sales orders found");
  }

  updateProgress(15);

  // Step 2: BOM explosion for each product
  const grossRequirements = new Map<string, { qty: number; requiredDate: Date }>();

  for (const order of salesOrders) {
    for (const line of order.lines) {
      const bomHeader = await prisma.bomHeader.findFirst({
        where: { productId: line.productId, status: "active" },
        include: { bomLines: { include: { part: true } } },
      });

      if (!bomHeader) continue;

      for (const bomLine of bomHeader.bomLines) {
        const scrapMultiplier = 1 + (bomLine.scrapRate || 0);
        const totalQty = bomLine.quantity * scrapMultiplier * line.quantity;
        const existing = grossRequirements.get(bomLine.partId);

        if (existing) {
          existing.qty += totalQty;
          if (order.requiredDate < existing.requiredDate) {
            existing.requiredDate = order.requiredDate;
          }
        } else {
          grossRequirements.set(bomLine.partId, {
            qty: totalQty,
            requiredDate: order.requiredDate,
          });
        }
      }
    }
  }

  updateProgress(40);

  // Step 3: Get current inventory and part details
  const partIds = Array.from(grossRequirements.keys());

  const [parts, inventories, purchaseOrderLines] = await Promise.all([
    prisma.part.findMany({
      where: { id: { in: partIds } },
      include: {
        partSuppliers: { where: { isPreferred: true }, include: { supplier: true }, take: 1 },
      },
    }),
    prisma.inventory.findMany({ where: { partId: { in: partIds } } }),
    prisma.purchaseOrderLine.findMany({
      where: { partId: { in: partIds }, status: { in: ["pending", "ordered", "partial"] } },
      include: { po: true },
    }),
  ]);

  updateProgress(60);

  // Build lookup maps
  const partMap = new Map(parts.map((p) => [p.id, p]));
  const onHandMap = new Map<string, number>();
  for (const inv of inventories) {
    onHandMap.set(inv.partId, (onHandMap.get(inv.partId) || 0) + inv.quantity - inv.reservedQty);
  }
  const onOrderMap = new Map<string, number>();
  for (const poLine of purchaseOrderLines) {
    onOrderMap.set(poLine.partId, (onOrderMap.get(poLine.partId) || 0) + (poLine.quantity - poLine.receivedQty));
  }

  // Step 4: Calculate net requirements
  const requirements: Array<{
    partId: string; partNumber: string; partName: string; category: string; unit: string;
    grossRequirement: number; onHand: number; onOrder: number; safetyStock: number;
    netRequirement: number; status: "CRITICAL" | "LOW" | "OK";
    supplierName: string | null; supplierId: string | null; leadTime: number;
    unitCost: number; totalCost: number;
  }> = [];
  const suggestions: Array<{
    id: string; partId: string; partNumber: string; partName: string;
    supplierName: string | null; supplierId: string | null;
    quantity: number; unit: string; unitCost: number; totalCost: number;
    orderDate: string; requiredDate: string; priority: "URGENT" | "HIGH" | "NORMAL"; leadTime: number;
  }> = [];
  const runDate = new Date();

  for (const [partId, gross] of grossRequirements) {
    const part = partMap.get(partId);
    if (!part) continue;

    const onHand = onHandMap.get(partId) || 0;
    const onOrder = onOrderMap.get(partId) || 0;
    const safetyStock = includeSafetyStock ? (part.safetyStock || 0) : 0;
    const netRequirement = Math.max(0, gross.qty - onHand - onOrder + safetyStock);

    let status: "CRITICAL" | "LOW" | "OK" = "OK";
    if (netRequirement > 0) {
      const daysUntilRequired = Math.ceil((gross.requiredDate.getTime() - runDate.getTime()) / (1000 * 60 * 60 * 24));
      const leadTime = part.leadTimeDays || 14;
      if (daysUntilRequired < leadTime) status = "CRITICAL";
      else if (daysUntilRequired < leadTime * 1.5) status = "LOW";
    }

    const preferredSupplier = part.partSuppliers[0];

    requirements.push({
      partId: part.id, partNumber: part.partNumber, partName: part.name,
      category: part.category, unit: part.unit,
      grossRequirement: Math.round(gross.qty), onHand, onOrder, safetyStock,
      netRequirement: Math.round(netRequirement), status,
      supplierName: preferredSupplier?.supplier.name || null,
      supplierId: preferredSupplier?.supplierId || null,
      leadTime: part.leadTimeDays || 14,
      unitCost: part.unitCost || 0,
      totalCost: Math.round(netRequirement * (part.unitCost || 0)),
    });

    if (netRequirement > 0) {
      const leadTime = part.leadTimeDays || 14;
      const orderDate = new Date(gross.requiredDate);
      orderDate.setDate(orderDate.getDate() - leadTime);

      suggestions.push({
        id: `sug_${part.id}`, partId: part.id, partNumber: part.partNumber, partName: part.name,
        supplierName: preferredSupplier?.supplier.name || null,
        supplierId: preferredSupplier?.supplierId || null,
        quantity: Math.round(netRequirement), unit: part.unit,
        unitCost: preferredSupplier?.unitPrice || part.unitCost || 0,
        totalCost: Math.round(netRequirement * (preferredSupplier?.unitPrice || part.unitCost || 0)),
        orderDate: orderDate.toISOString().split("T")[0],
        requiredDate: gross.requiredDate.toISOString().split("T")[0],
        priority: status === "CRITICAL" ? "URGENT" : status === "LOW" ? "HIGH" : "NORMAL",
        leadTime,
      });
    }
  }

  updateProgress(80);

  // Sort
  const statusOrder = { CRITICAL: 0, LOW: 1, OK: 2 };
  requirements.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  const priorityOrder = { URGENT: 0, HIGH: 1, NORMAL: 2 };
  suggestions.sort((a, b) => {
    const d = priorityOrder[a.priority] - priorityOrder[b.priority];
    return d !== 0 ? d : new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime();
  });

  // Step 5: Save MRP run history
  const runNumber = `MRP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-4)}`;

  const mrpRun = await prisma.mrpRun.create({
    data: {
      runNumber, runDate, planningHorizon,
      status: "completed",
      totalParts: requirements.length,
      purchaseSuggestions: suggestions.length,
      expediteAlerts: requirements.filter((r) => r.status === "CRITICAL").length,
      shortageWarnings: requirements.filter((r) => r.status === "LOW").length,
      parameters: { orderIds, includeSafetyStock, planningHorizon },
      completedAt: new Date(),
    },
  });

  if (suggestions.length > 0) {
    await prisma.mrpSuggestion.createMany({
      data: suggestions.map((s) => ({
        mrpRunId: mrpRun.id,
        partId: s.partId,
        actionType: "PURCHASE",
        priority: s.priority,
        suggestedQty: s.quantity,
        suggestedDate: new Date(s.requiredDate),
        currentStock: requirements.find((r) => r.partId === s.partId)?.onHand || 0,
        requiredQty: requirements.find((r) => r.partId === s.partId)?.grossRequirement || 0,
        shortageQty: s.quantity,
        reason: `Net requirement after BOM explosion for ${orderIds.length} sales order(s)`,
        supplierId: s.supplierId,
        estimatedCost: s.totalCost,
        status: "pending",
      })),
    });
  }

  updateProgress(100);

  const summary = {
    totalRequirements: requirements.length,
    criticalItems: requirements.filter((r) => r.status === "CRITICAL").length,
    lowItems: requirements.filter((r) => r.status === "LOW").length,
    okItems: requirements.filter((r) => r.status === "OK").length,
    totalPurchaseValue: suggestions.reduce((sum, s) => sum + s.totalCost, 0),
  };

  return {
    runId: mrpRun.id,
    runNumber: mrpRun.runNumber,
    runDate: mrpRun.runDate.toISOString(),
    salesOrders: orderIds,
    status: "Completed",
    summary,
    requirements,
    suggestions,
  };
};

// ============================================
// REGISTER ALL HANDLERS
// ============================================

export function registerJobHandlers(): void {
  jobQueue.register(JOB_NAMES.CACHE_WARMING, cacheWarmingHandler);
  jobQueue.register(JOB_NAMES.CLEANUP, cleanupHandler);
  jobQueue.register(JOB_NAMES.REPORT_GENERATION, reportGenerationHandler);
  jobQueue.register(JOB_NAMES.DATA_SYNC, dataSyncHandler);
  jobQueue.register(JOB_NAMES.EXCEL_IMPORT, excelImportHandler);
  jobQueue.register(JOB_NAMES.MRP_CALCULATION, mrpCalculateHandler);

  logger.info("Background job handlers registered (6 handlers)");
}

// Auto-register on import
if (typeof window === "undefined") {
  registerJobHandlers();
}

export default registerJobHandlers;
