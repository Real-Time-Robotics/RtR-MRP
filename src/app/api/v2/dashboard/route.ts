// =============================================================================
// RTR MRP - DASHBOARD API ROUTE (SECURED)
// /api/v2/dashboard/route.ts
// =============================================================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthUser } from '@/lib/auth/middleware';
import { handleError, successResponse } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { cache, cacheTTL } from '@/lib/cache/redis';

// =============================================================================
// GET - Dashboard data (requires authentication)
// =============================================================================

export const GET = withAuth(
  async (request: NextRequest, { user }: { params: any; user: AuthUser }) => {
    const startTime = performance.now();

    try {
      logger.info('Fetching dashboard data', { userId: user.id });

      // Try cache first
      const cacheKey = `v2:dashboard:${user.id}`;
      const cached = await cache.get<any>(cacheKey);
      if (cached) {
        logger.info('Dashboard served from cache', { userId: user.id });
        return successResponse({ ...cached, _cached: true });
      }

      // Get date ranges
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Parallel queries for better performance
      const [
        // Inventory metrics
        totalParts,
        lowStockParts,
        outOfStockParts,
        inventoryValue,

        // Sales metrics
        totalOrders,
        pendingOrders,
        monthlyRevenue,
        lastMonthRevenue,

        // Production metrics
        activeWorkOrders,
        completedWorkOrdersMTD,

        // Quality metrics
        openNCRs,

        // Recent data for charts
        recentOrders,
        recentWorkOrders,
        inventoryByCategory,
      ] = await Promise.all([
        // Parts count
        prisma.part.count(),

        // Low stock (simplified - actual logic would check against reorderPoint)
        prisma.inventory.count({
          where: { quantity: { lte: 20 } }
        }),

        // Out of stock
        prisma.inventory.count({
          where: { quantity: { lte: 0 } }
        }),

        // Total inventory quantity (value calculation requires join with parts)
        prisma.inventory.aggregate({
          _sum: { quantity: true }
        }),

        // Total sales orders
        prisma.salesOrder.count(),

        // Pending orders
        prisma.salesOrder.count({
          where: { status: { in: ['PENDING', 'CONFIRMED'] } }
        }),

        // This month revenue
        prisma.salesOrder.aggregate({
          _sum: { totalAmount: true },
          where: {
            orderDate: { gte: startOfMonth },
            status: { notIn: ['CANCELLED', 'DRAFT'] }
          }
        }),

        // Last month revenue
        prisma.salesOrder.aggregate({
          _sum: { totalAmount: true },
          where: {
            orderDate: { gte: startOfLastMonth, lte: endOfLastMonth },
            status: { notIn: ['CANCELLED', 'DRAFT'] }
          }
        }),

        // Active work orders
        prisma.workOrder.count({
          where: { status: { in: ['RELEASED', 'IN_PROGRESS'] } }
        }),

        // Completed WOs this month
        prisma.workOrder.count({
          where: {
            status: 'COMPLETED',
            actualEnd: { gte: startOfMonth }
          }
        }),

        // Open NCRs
        prisma.nCR.count({
          where: { status: 'open' }
        }),

        // Recent orders for table
        prisma.salesOrder.findMany({
          take: 5,
          orderBy: { orderDate: 'desc' },
          include: {
            customer: { select: { name: true, code: true } },
            lines: { select: { quantity: true } }
          }
        }),

        // Recent work orders
        prisma.workOrder.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            product: { select: { name: true, sku: true } }
          }
        }),

        // Inventory by category
        prisma.part.groupBy({
          by: ['category'],
          _count: true,
        }),
      ]);

      // Calculate trends
      const currentRevenue = Number(monthlyRevenue._sum.totalAmount || 0);
      const previousRevenue = Number(lastMonthRevenue._sum.totalAmount || 0);
      const revenueTrend = previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
        : 0;

      // Build response
      const dashboardData = {
        kpis: {
          inventory: {
            totalParts,
            lowStockParts,
            outOfStockParts,
            totalQuantity: Number(inventoryValue._sum.quantity || 0),
          },
          sales: {
            totalOrders,
            pendingOrders,
            monthlyRevenue: currentRevenue,
            revenueTrend: Number(revenueTrend),
          },
          production: {
            activeWorkOrders,
            completedMTD: completedWorkOrdersMTD,
          },
          quality: {
            openNCRs,
          },
        },
        recentOrders: recentOrders.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          customer: order.customer.name,
          customerCode: order.customer.code,
          amount: Number(order.totalAmount || 0),
          status: order.status,
          date: order.orderDate,
          itemCount: order.lines.length,
        })),
        recentWorkOrders: recentWorkOrders.map(wo => ({
          id: wo.id,
          woNumber: wo.woNumber,
          product: wo.product.name,
          sku: wo.product.sku,
          quantity: Number(wo.quantity),
          completed: Number(wo.completedQty),
          status: wo.status,
          dueDate: wo.plannedEnd,
        })),
        inventoryByCategory: inventoryByCategory.map(cat => ({
          category: cat.category,
          count: cat._count,
        })),
      };

      const duration = performance.now() - startTime;
      logger.info('Dashboard data fetched', { userId: user.id, durationMs: duration.toFixed(2) });

      // Cache for 30 seconds
      await cache.set(cacheKey, dashboardData, cacheTTL.SHORT);

      return successResponse(dashboardData);
    } catch (error) {
      logger.logError(error as Error, { context: 'dashboard' });
      return handleError(error);
    }
  },
  { permission: 'analytics:read' }
);
