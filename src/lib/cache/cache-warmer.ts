// src/lib/cache/cache-warmer.ts
// Cache warming service for pre-populating frequently accessed data

import { cache, cacheKeys, cacheTTL } from "./redis";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/monitoring/logger";

interface WarmingResult {
  key: string;
  success: boolean;
  duration: number;
  error?: string;
}

interface CacheWarmingReport {
  startTime: string;
  endTime: string;
  totalDuration: number;
  results: WarmingResult[];
  summary: {
    total: number;
    success: number;
    failed: number;
  };
}

// ============================================
// CACHE WARMING FUNCTIONS
// ============================================

/**
 * Warm dashboard stats cache
 */
async function warmDashboardStats(): Promise<WarmingResult> {
  const start = Date.now();
  const key = cacheKeys.dashboardStats();

  try {
    // Get counts in parallel
    const [
      pendingOrdersCount,
      pendingOrdersValue,
      activePoCount,
      activePoValue,
      criticalStockCount,
    ] = await Promise.all([
      prisma.salesOrder.count({
        where: { status: { in: ["draft", "confirmed"] } },
      }),
      prisma.salesOrder.aggregate({
        where: { status: { in: ["draft", "confirmed"] } },
        _sum: { totalAmount: true },
      }),
      prisma.purchaseOrder.count({
        where: { status: { notIn: ["received", "cancelled"] } },
      }),
      prisma.purchaseOrder.aggregate({
        where: { status: { notIn: ["received", "cancelled"] } },
        _sum: { totalAmount: true },
      }),
      prisma.inventory.count({
        where: {
          quantity: { lte: prisma.inventory.fields.reservedQty },
        },
      }),
    ]);

    const data = {
      pendingOrders: pendingOrdersCount,
      pendingOrdersValue: pendingOrdersValue._sum.totalAmount || 0,
      activePOs: activePoCount,
      activePOsValue: activePoValue._sum.totalAmount || 0,
      criticalStock: criticalStockCount,
      reorderAlerts: 0, // Simplified for warming
    };

    await cache.set(key, data, cacheTTL.MEDIUM);

    return {
      key,
      success: true,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      key,
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Warm work orders list cache (first page)
 */
async function warmWorkOrdersList(): Promise<WarmingResult> {
  const start = Date.now();
  const params = { page: 1, pageSize: 50 };
  const key = cacheKeys.workOrders(params);

  try {
    const [totalCount, workOrders] = await Promise.all([
      prisma.workOrder.count(),
      prisma.workOrder.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: { id: true, name: true, sku: true } },
          salesOrder: {
            select: {
              id: true,
              orderNumber: true,
              customer: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ]);

    const data = {
      data: workOrders,
      pagination: {
        page: 1,
        pageSize: 50,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / 50),
        hasNextPage: totalCount > 50,
        hasPrevPage: false,
      },
      meta: { took: Date.now() - start, cached: false },
    };

    await cache.set(key, data, cacheTTL.SHORT);

    return {
      key,
      success: true,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      key,
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Warm sales orders list cache (first page)
 */
async function warmSalesOrdersList(): Promise<WarmingResult> {
  const start = Date.now();
  const params = { page: 1, pageSize: 50 };
  const key = cacheKeys.salesOrders(params);

  try {
    const [totalCount, orders] = await Promise.all([
      prisma.salesOrder.count(),
      prisma.salesOrder.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { id: true, name: true } },
          lines: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
            take: 5,
          },
        },
      }),
    ]);

    const data = {
      data: orders,
      pagination: {
        page: 1,
        pageSize: 50,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / 50),
        hasNextPage: totalCount > 50,
        hasPrevPage: false,
      },
      meta: { took: Date.now() - start, cached: false },
    };

    await cache.set(key, data, cacheTTL.SHORT);

    return {
      key,
      success: true,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      key,
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Warm parts list cache (first page)
 */
async function warmPartsList(): Promise<WarmingResult> {
  const start = Date.now();
  const params = { page: 1, pageSize: 50 };
  const key = cacheKeys.parts(params);

  try {
    const [totalCount, parts] = await Promise.all([
      prisma.part.count(),
      prisma.part.findMany({
        take: 50,
        orderBy: { partNumber: "asc" },
        include: {
          partSuppliers: {
            include: { supplier: true },
            orderBy: { isPreferred: "desc" },
            take: 1,
          },
        },
      }),
    ]);

    const data = {
      data: parts,
      pagination: {
        page: 1,
        pageSize: 50,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / 50),
        hasNextPage: totalCount > 50,
        hasPrevPage: false,
      },
      meta: { took: Date.now() - start, cached: false },
    };

    await cache.set(key, data, cacheTTL.STANDARD);

    return {
      key,
      success: true,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      key,
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Warm suppliers list cache
 */
async function warmSuppliersList(): Promise<WarmingResult> {
  const start = Date.now();
  const params = { page: 1, pageSize: 50 };
  const key = cacheKeys.suppliers(params);

  try {
    const [totalCount, suppliers] = await Promise.all([
      prisma.supplier.count(),
      prisma.supplier.findMany({
        take: 50,
        orderBy: { name: "asc" },
      }),
    ]);

    const data = {
      data: suppliers,
      pagination: {
        page: 1,
        pageSize: 50,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / 50),
        hasNextPage: totalCount > 50,
        hasPrevPage: false,
      },
      meta: { took: Date.now() - start, cached: false },
    };

    await cache.set(key, data, cacheTTL.STANDARD);

    return {
      key,
      success: true,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      key,
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================
// MAIN WARMING FUNCTION
// ============================================

/**
 * Warm all critical caches
 */
export async function warmAllCaches(): Promise<CacheWarmingReport> {
  const startTime = new Date();
  logger.info("Starting cache warming...");

  const warmingFunctions = [
    warmDashboardStats,
    warmWorkOrdersList,
    warmSalesOrdersList,
    warmPartsList,
    warmSuppliersList,
  ];

  const results = await Promise.all(warmingFunctions.map((fn) => fn()));

  const endTime = new Date();
  const report: CacheWarmingReport = {
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    totalDuration: endTime.getTime() - startTime.getTime(),
    results,
    summary: {
      total: results.length,
      success: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    },
  };

  logger.info("Cache warming completed", {
    duration: report.totalDuration,
    success: report.summary.success,
    failed: report.summary.failed,
  });

  return report;
}

/**
 * Warm specific cache by key type
 */
export async function warmCache(
  type: "dashboard" | "workOrders" | "salesOrders" | "parts" | "suppliers"
): Promise<WarmingResult> {
  switch (type) {
    case "dashboard":
      return warmDashboardStats();
    case "workOrders":
      return warmWorkOrdersList();
    case "salesOrders":
      return warmSalesOrdersList();
    case "parts":
      return warmPartsList();
    case "suppliers":
      return warmSuppliersList();
    default:
      return {
        key: type,
        success: false,
        duration: 0,
        error: "Unknown cache type",
      };
  }
}

// ============================================
// SCHEDULED WARMING
// ============================================

let warmingInterval: NodeJS.Timeout | null = null;

/**
 * Start scheduled cache warming
 */
export function startScheduledWarming(intervalMs: number = 5 * 60 * 1000): void {
  if (warmingInterval) {
    clearInterval(warmingInterval);
  }

  // Initial warming
  warmAllCaches().catch((error) => {
    logger.error("Initial cache warming failed", error);
  });

  // Scheduled warming
  warmingInterval = setInterval(() => {
    warmAllCaches().catch((error) => {
      logger.error("Scheduled cache warming failed", error);
    });
  }, intervalMs);

  logger.info(`Scheduled cache warming started (interval: ${intervalMs}ms)`);
}

/**
 * Stop scheduled cache warming
 */
export function stopScheduledWarming(): void {
  if (warmingInterval) {
    clearInterval(warmingInterval);
    warmingInterval = null;
    logger.info("Scheduled cache warming stopped");
  }
}

export default {
  warmAllCaches,
  warmCache,
  startScheduledWarming,
  stopScheduledWarming,
};
