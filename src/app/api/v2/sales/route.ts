// =============================================================================
// RTR MRP - SALES ORDERS API ROUTE (SECURED)
// /api/v2/sales/route.ts
// =============================================================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthUser } from '@/lib/auth/middleware';
import { sanitize, sanitizeObject } from '@/lib/security/sanitize';
import { handleError, successResponse, paginatedResponse } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// =============================================================================
// SCHEMAS
// =============================================================================

const salesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  status: z.enum(['DRAFT', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  view: z.enum(['list', 'kanban']).default('list'),
});

const salesOrderLineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  discountPercent: z.number().min(0).max(100).default(0),
});

const salesOrderCreateSchema = z.object({
  customerId: z.string().min(1),
  orderDate: z.string().datetime().optional(),
  requestedDate: z.string().datetime().optional(),
  promisedDate: z.string().datetime().optional(),
  status: z.enum(['DRAFT', 'PENDING', 'CONFIRMED']).default('DRAFT'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  currency: z.string().length(3).default('USD'),
  paymentTerms: z.string().max(50).optional(),
  shippingMethod: z.string().max(50).optional(),
  shippingAddress: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  lines: z.array(salesOrderLineSchema).min(1),
});

// =============================================================================
// GET - List sales orders (requires sales:read permission)
// =============================================================================

export const GET = withAuth(
  async (request: NextRequest, { user }: { params: any; user: AuthUser }) => {
    const startTime = performance.now();

    try {
      const { searchParams } = new URL(request.url);

      // Validate query parameters
      const paramsObj: Record<string, string> = {};
      searchParams.forEach((value, key) => { paramsObj[key] = value; });

      const validation = salesQuerySchema.safeParse(paramsObj);
      if (!validation.success) {
        return handleError(validation.error);
      }

      const params = validation.data;
      const sanitizedSearch = params.search ? sanitize(params.search) : undefined;

      logger.info('Fetching sales orders', {
        userId: user.id,
        filters: { ...params, search: sanitizedSearch }
      });

      // Build where clause
      const where: any = {};

      if (sanitizedSearch) {
        where.OR = [
          { soNumber: { contains: sanitizedSearch, mode: 'insensitive' } },
          { customer: { name: { contains: sanitizedSearch, mode: 'insensitive' } } },
          { customer: { code: { contains: sanitizedSearch, mode: 'insensitive' } } },
        ];
      }

      if (params.status) {
        where.status = params.status;
      }

      if (params.priority) {
        where.priority = params.priority;
      }

      // Get total count
      const total = await prisma.salesOrder.count({ where });

      // Get orders
      const orders = await prisma.salesOrder.findMany({
        where,
        skip: params.view === 'kanban' ? 0 : (params.page - 1) * params.pageSize,
        take: params.view === 'kanban' ? 100 : params.pageSize,
        orderBy: { orderDate: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              code: true,
              name: true,
              email: true,
              phone: true,
              contactName: true,
              address: true,
              city: true,
              country: true,
              type: true,
              ndaaRequired: true,
              itarRequired: true,
            }
          },
          lines: {
            include: {
              product: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                  basePrice: true,
                }
              }
            }
          },
        },
      });

      // Format orders
      const formattedOrders = orders.map(order => ({
        id: order.id,
        soNumber: order.soNumber,
        customer: order.customer,
        orderDate: order.orderDate,
        requestedDate: order.requestedDate,
        promisedDate: order.promisedDate,
        status: order.status,
        priority: order.priority,
        totalAmount: Number(order.totalAmount),
        currency: order.currency,
        paymentTerms: order.paymentTerms,
        shippingMethod: order.shippingMethod,
        shippingAddress: order.shippingAddress,
        lines: order.lines.map(line => ({
          id: line.id,
          lineNumber: line.lineNumber,
          product: line.product,
          quantity: Number(line.quantity),
          unitPrice: Number(line.unitPrice),
          discountPercent: Number(line.discountPercent),
          lineTotal: Number(line.lineTotal),
          status: line.status,
        })),
        lineCount: order.lines.length,
        totalQuantity: order.lines.reduce((sum, l) => sum + Number(l.quantity), 0),
        notes: order.notes,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      }));

      // Group by status for Kanban view
      let kanbanData = null;
      if (params.view === 'kanban') {
        kanbanData = {
          PENDING: formattedOrders.filter(o => o.status === 'PENDING'),
          CONFIRMED: formattedOrders.filter(o => o.status === 'CONFIRMED'),
          IN_PROGRESS: formattedOrders.filter(o => o.status === 'IN_PROGRESS'),
          SHIPPED: formattedOrders.filter(o => o.status === 'SHIPPED'),
          COMPLETED: formattedOrders.filter(o => o.status === 'COMPLETED'),
        };
      }

      // Get KPIs
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [totalOrdersCount, pendingCount, monthlyRevenue, avgOrderValue] = await Promise.all([
        prisma.salesOrder.count(),
        prisma.salesOrder.count({ where: { status: { in: ['PENDING', 'CONFIRMED'] } } }),
        prisma.salesOrder.aggregate({
          _sum: { totalAmount: true },
          where: {
            orderDate: { gte: startOfMonth },
            status: { notIn: ['CANCELLED', 'DRAFT'] }
          }
        }),
        prisma.salesOrder.aggregate({
          _avg: { totalAmount: true },
          where: { status: { notIn: ['CANCELLED', 'DRAFT'] } }
        }),
      ]);

      const duration = performance.now() - startTime;
      logger.info('Sales orders fetched', { userId: user.id, total, durationMs: duration.toFixed(2) });

      return successResponse({
        items: params.view === 'kanban' ? null : formattedOrders,
        kanban: kanbanData,
        total,
        page: params.page,
        pageSize: params.pageSize,
        totalPages: Math.ceil(total / params.pageSize),
        kpis: {
          totalOrders: totalOrdersCount,
          pendingOrders: pendingCount,
          monthlyRevenue: Number(monthlyRevenue._sum.totalAmount || 0),
          avgOrderValue: Number(avgOrderValue._avg.totalAmount || 0),
        },
      });
    } catch (error) {
      logger.logError(error as Error, { context: 'sales-list' });
      return handleError(error);
    }
  },
  { permission: 'sales:read' }
);

// =============================================================================
// POST - Create sales order (requires sales:write permission)
// =============================================================================

export const POST = withAuth(
  async (request: NextRequest, { user }: { params: any; user: AuthUser }) => {
    const startTime = performance.now();

    try {
      const body = await request.json();

      // Validate input
      const validation = salesOrderCreateSchema.safeParse(body);
      if (!validation.success) {
        return handleError(validation.error);
      }

      const data = validation.data;
      const sanitizedData = sanitizeObject(data);

      logger.info('Creating sales order', {
        userId: user.id,
        customerId: sanitizedData.customerId
      });

      // Generate SO number
      const lastOrder = await prisma.salesOrder.findFirst({
        orderBy: { soNumber: 'desc' }
      });
      const nextNumber = lastOrder
        ? parseInt(lastOrder.soNumber.replace('SO-', '')) + 1
        : 1;
      const soNumber = `SO-${String(nextNumber).padStart(6, '0')}`;

      // Calculate totals
      const totalAmount = sanitizedData.lines.reduce((sum, line) => {
        const lineTotal = line.quantity * line.unitPrice * (1 - (line.discountPercent || 0) / 100);
        return sum + lineTotal;
      }, 0);

      // Create order with lines
      const order = await prisma.salesOrder.create({
        data: {
          soNumber,
          customerId: sanitizedData.customerId,
          orderDate: sanitizedData.orderDate ? new Date(sanitizedData.orderDate) : new Date(),
          requestedDate: sanitizedData.requestedDate ? new Date(sanitizedData.requestedDate) : null,
          promisedDate: sanitizedData.promisedDate ? new Date(sanitizedData.promisedDate) : null,
          status: sanitizedData.status,
          priority: sanitizedData.priority,
          totalAmount,
          currency: sanitizedData.currency,
          paymentTerms: sanitizedData.paymentTerms,
          shippingMethod: sanitizedData.shippingMethod,
          shippingAddress: sanitizedData.shippingAddress,
          notes: sanitizedData.notes,
          createdBy: user.id,
          lines: {
            create: sanitizedData.lines.map((line, index) => ({
              productId: line.productId,
              lineNumber: index + 1,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discountPercent: line.discountPercent || 0,
              lineTotal: line.quantity * line.unitPrice * (1 - (line.discountPercent || 0) / 100),
              status: 'DRAFT',
            })),
          },
        },
        include: {
          customer: true,
          lines: { include: { product: true } },
        },
      });

      // Audit log
      logger.audit('CREATE', 'salesOrder', order.id, {
        soNumber: order.soNumber,
        customerId: order.customerId,
        totalAmount,
        userId: user.id
      });

      const duration = performance.now() - startTime;
      logger.info('Sales order created', {
        userId: user.id,
        orderId: order.id,
        soNumber: order.soNumber,
        durationMs: duration.toFixed(2)
      });

      return successResponse(order, 'Sales order created successfully', 201);
    } catch (error) {
      logger.logError(error as Error, { context: 'sales-create' });
      return handleError(error);
    }
  },
  { permission: 'sales:write' }
);
