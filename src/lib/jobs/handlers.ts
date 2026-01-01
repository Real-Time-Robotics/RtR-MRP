// src/lib/jobs/handlers.ts
// Background job handlers for heavy operations

import { jobQueue, JOB_NAMES, Job, JobHandler } from "./job-queue";
import { warmAllCaches } from "@/lib/cache/cache-warmer";
import { cache } from "@/lib/cache/redis";
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
          data: { averageCost: item._avg.unitPrice },
        });
      }
    }

    results.pricesUpdated = partsWithPO.length;
    updateProgress(80);
  }

  // Invalidate related caches
  await cache.deletePattern("mrp:*");

  updateProgress(100);

  return {
    entityType,
    results,
    syncedAt: new Date().toISOString(),
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

  logger.info("Background job handlers registered");
}

// Auto-register on import
if (typeof window === "undefined") {
  registerJobHandlers();
}

export default registerJobHandlers;
