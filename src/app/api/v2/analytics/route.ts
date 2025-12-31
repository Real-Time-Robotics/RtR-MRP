// =============================================================================
// RTR MRP - ANALYTICS API ROUTE (SECURED)
// /api/v2/analytics/route.ts
// =============================================================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthUser } from '@/lib/auth/middleware';
import { handleError, successResponse } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// =============================================================================
// SCHEMAS
// =============================================================================

const analyticsQuerySchema = z.object({
  tab: z.enum(['overview', 'inventory', 'sales', 'production', 'quality']).default('overview'),
  period: z.coerce.number().int().min(1).max(365).default(30),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// =============================================================================
// GET - Analytics data (requires analytics:read permission)
// =============================================================================

export const GET = withAuth(
  async (request: NextRequest, { user }: { params: any; user: AuthUser }) => {
    const startTime = performance.now();

    try {
      const { searchParams } = new URL(request.url);

      // Validate query parameters
      const paramsObj: Record<string, string> = {};
      searchParams.forEach((value, key) => { paramsObj[key] = value; });

      const validation = analyticsQuerySchema.safeParse(paramsObj);
      if (!validation.success) {
        return handleError(validation.error);
      }

      const params = validation.data;

      // Calculate date range
      const now = new Date();
      const rangeStart = params.startDate
        ? new Date(params.startDate)
        : new Date(now.getTime() - params.period * 24 * 60 * 60 * 1000);
      const rangeEnd = params.endDate ? new Date(params.endDate) : now;

      logger.info('Fetching analytics', {
        userId: user.id,
        tab: params.tab,
        period: params.period
      });

      let data;

      switch (params.tab) {
        case 'overview':
          data = await getOverviewAnalytics(rangeStart, rangeEnd);
          break;
        case 'inventory':
          data = await getInventoryAnalytics(rangeStart, rangeEnd);
          break;
        case 'sales':
          data = await getSalesAnalytics(rangeStart, rangeEnd);
          break;
        case 'production':
          data = await getProductionAnalytics(rangeStart, rangeEnd);
          break;
        case 'quality':
          data = await getQualityAnalytics(rangeStart, rangeEnd);
          break;
        default:
          data = await getOverviewAnalytics(rangeStart, rangeEnd);
      }

      const duration = performance.now() - startTime;
      logger.info('Analytics fetched', {
        userId: user.id,
        tab: params.tab,
        durationMs: duration.toFixed(2)
      });

      return successResponse(data);
    } catch (error) {
      logger.logError(error as Error, { context: 'analytics' });
      return handleError(error);
    }
  },
  { permission: 'analytics:read' }
);

// =============================================================================
// ANALYTICS FUNCTIONS
// =============================================================================

async function getOverviewAnalytics(startDate: Date, endDate: Date) {
  const [
    totalRevenue,
    totalOrders,
    completedWorkOrders,
    inventoryValue,
    recentOrders,
    recentWorkOrders,
    lowStockParts,
    overdueOrders,
    openNCRs,
  ] = await Promise.all([
    prisma.salesOrder.aggregate({
      _sum: { totalAmount: true },
      where: {
        orderDate: { gte: startDate, lte: endDate },
        status: { notIn: ['CANCELLED', 'DRAFT'] }
      }
    }),
    prisma.salesOrder.count({
      where: {
        orderDate: { gte: startDate, lte: endDate },
        status: { notIn: ['CANCELLED', 'DRAFT'] }
      }
    }),
    prisma.workOrder.count({
      where: {
        actualEnd: { gte: startDate, lte: endDate },
        status: 'COMPLETED'
      }
    }),
    prisma.inventory.aggregate({
      _sum: { quantity: true }
    }),
    prisma.salesOrder.findMany({
      take: 5,
      orderBy: { orderDate: 'desc' },
      include: { customer: { select: { name: true } } }
    }),
    prisma.workOrder.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { name: true, sku: true } } }
    }),
    prisma.inventory.count({
      where: { quantity: { lte: 20 } }
    }),
    prisma.salesOrder.count({
      where: {
        promisedDate: { lt: new Date() },
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] }
      }
    }),
    prisma.nCR.count({
      where: { status: { not: 'closed' } }
    }),
  ]);

  return {
    kpis: {
      totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
      totalOrders,
      completedWorkOrders,
      inventoryValue: Number(inventoryValue._sum.quantity || 0),
      avgOrderValue: totalOrders > 0
        ? Number(totalRevenue._sum.totalAmount || 0) / totalOrders
        : 0,
    },
    recentOrders: recentOrders.map(o => ({
      id: o.id,
      soNumber: o.soNumber,
      customer: o.customer.name,
      amount: Number(o.totalAmount),
      status: o.status,
      date: o.orderDate,
    })),
    recentWorkOrders: recentWorkOrders.map(wo => ({
      id: wo.id,
      woNumber: wo.woNumber,
      product: wo.product.name,
      sku: wo.product.sku,
      quantity: Number(wo.quantity),
      status: wo.status,
    })),
    alerts: {
      lowStock: lowStockParts,
      overdueOrders,
      openNCRs,
    },
  };
}

async function getInventoryAnalytics(startDate: Date, endDate: Date) {
  const [
    inventorySummary,
    totalParts,
    valueByCategory,
  ] = await Promise.all([
    prisma.inventory.aggregate({
      _sum: { quantity: true, reservedQty: true }
    }),
    prisma.part.count(),
    prisma.part.groupBy({
      by: ['category'],
      _count: true,
    }),
  ]);

  // Stock status distribution
  const allInventory = await prisma.inventory.findMany({
    include: {
      part: { select: { minStock: true, reorderPoint: true, maxStock: true } }
    }
  });

  const stockDistribution = {
    inStock: 0,
    lowStock: 0,
    critical: 0,
    outOfStock: 0,
    overstock: 0,
  };

  allInventory.forEach(inv => {
    const qty = Number(inv.quantity);
    if (qty <= 0) stockDistribution.outOfStock++;
    else if (qty <= inv.part.minStock) stockDistribution.critical++;
    else if (qty <= inv.part.reorderPoint) stockDistribution.lowStock++;
    else if (inv.part.maxStock && qty >= inv.part.maxStock) stockDistribution.overstock++;
    else stockDistribution.inStock++;
  });

  return {
    summary: {
      totalQuantity: Number(inventorySummary._sum.quantity || 0),
      reservedQuantity: Number(inventorySummary._sum.reservedQty || 0),
      totalParts,
    },
    byCategory: valueByCategory.map(c => ({
      category: c.category,
      count: c._count,
    })),
    stockDistribution,
  };
}

async function getSalesAnalytics(startDate: Date, endDate: Date) {
  const [
    summary,
    byStatus,
    monthlyTrend,
  ] = await Promise.all([
    prisma.salesOrder.aggregate({
      _sum: { totalAmount: true },
      _count: true,
      _avg: { totalAmount: true },
      where: {
        orderDate: { gte: startDate, lte: endDate },
        status: { notIn: ['CANCELLED', 'DRAFT'] }
      }
    }),
    prisma.salesOrder.groupBy({
      by: ['status'],
      _count: true,
      _sum: { totalAmount: true },
      where: {
        orderDate: { gte: startDate, lte: endDate }
      }
    }),
    prisma.salesOrder.groupBy({
      by: ['orderDate'],
      _count: true,
      _sum: { totalAmount: true },
      where: {
        orderDate: { gte: startDate, lte: endDate },
        status: { notIn: ['CANCELLED', 'DRAFT'] }
      }
    }),
  ]);

  return {
    summary: {
      totalRevenue: Number(summary._sum.totalAmount || 0),
      totalOrders: summary._count,
      avgOrderValue: Number(summary._avg.totalAmount || 0),
    },
    byStatus: byStatus.map(s => ({
      status: s.status,
      count: s._count,
      revenue: Number(s._sum.totalAmount || 0),
    })),
    trend: monthlyTrend.map(t => ({
      date: t.orderDate,
      orders: t._count,
      revenue: Number(t._sum.totalAmount || 0),
    })),
  };
}

async function getProductionAnalytics(startDate: Date, endDate: Date) {
  const [
    summary,
    byStatus,
    completedWOs,
  ] = await Promise.all([
    prisma.workOrder.aggregate({
      _count: true,
      _sum: { quantity: true, completedQty: true, scrapQty: true },
      where: {
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    prisma.workOrder.groupBy({
      by: ['status'],
      _count: true,
      _sum: { quantity: true },
      where: {
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    prisma.workOrder.findMany({
      where: {
        status: 'COMPLETED',
        actualEnd: { gte: startDate, lte: endDate },
        plannedEnd: { not: null }
      },
      select: { actualEnd: true, plannedEnd: true }
    }),
  ]);

  // Calculate on-time delivery
  const onTimeCount = completedWOs.filter(wo =>
    wo.actualEnd && wo.plannedEnd && wo.actualEnd <= wo.plannedEnd
  ).length;

  return {
    summary: {
      totalWorkOrders: summary._count,
      totalQuantity: Number(summary._sum.quantity || 0),
      completedQuantity: Number(summary._sum.completedQty || 0),
      scrapQuantity: Number(summary._sum.scrapQty || 0),
      yieldRate: Number(summary._sum.quantity) > 0
        ? ((Number(summary._sum.completedQty) / Number(summary._sum.quantity)) * 100).toFixed(1)
        : 0,
    },
    byStatus: byStatus.map(s => ({
      status: s.status,
      count: s._count,
      quantity: Number(s._sum.quantity || 0),
    })),
    onTimeDelivery: {
      total: completedWOs.length,
      onTime: onTimeCount,
      rate: completedWOs.length > 0
        ? ((onTimeCount / completedWOs.length) * 100).toFixed(1)
        : 100,
    },
  };
}

async function getQualityAnalytics(startDate: Date, endDate: Date) {
  const [
    summary,
    bySource,
    byType,
  ] = await Promise.all([
    prisma.nCR.aggregate({
      _count: true,
      _sum: { quantityAffected: true, costImpact: true },
      where: {
        dateCreated: { gte: startDate, lte: endDate }
      }
    }),
    prisma.nCR.groupBy({
      by: ['source'],
      _count: true,
      _sum: { costImpact: true },
      where: {
        dateCreated: { gte: startDate, lte: endDate }
      }
    }),
    prisma.nCR.groupBy({
      by: ['type'],
      _count: true,
      _sum: { costImpact: true },
      where: {
        dateCreated: { gte: startDate, lte: endDate }
      }
    }),
  ]);

  return {
    summary: {
      totalNCRs: summary._count,
      quantityAffected: Number(summary._sum.quantityAffected || 0),
      totalCost: Number(summary._sum.costImpact || 0),
    },
    bySource: bySource.map(s => ({
      source: s.source,
      count: s._count,
      cost: Number(s._sum.costImpact || 0),
    })),
    byType: byType.map(t => ({
      type: t.type,
      count: t._count,
      cost: Number(t._sum.costImpact || 0),
    })),
  };
}
