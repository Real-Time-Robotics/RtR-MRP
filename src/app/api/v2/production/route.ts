// =============================================================================
// RTR MRP - PRODUCTION/WORK ORDERS API ROUTE (SECURED)
// /api/v2/production/route.ts
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

const productionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  status: z.enum(['DRAFT', 'RELEASED', 'SCHEDULED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CLOSED', 'CANCELLED']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  workCenter: z.string().max(50).optional(),
  view: z.enum(['list', 'kanban']).default('list'),
});

const workOrderOperationSchema = z.object({
  seq: z.number().int().positive(),
  name: z.string().min(1).max(100),
  workCenter: z.string().max(50).optional(),
  plannedHours: z.number().min(0),
});

const workOrderCreateSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(['DRAFT', 'RELEASED']).default('DRAFT'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  workCenter: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
  operations: z.array(workOrderOperationSchema).optional(),
});

// =============================================================================
// GET - List work orders (requires production:read permission)
// =============================================================================

export const GET = withAuth(
  async (request: NextRequest, { user }: { params: any; user: AuthUser }) => {
    const startTime = performance.now();

    try {
      const { searchParams } = new URL(request.url);

      // Validate query parameters
      const paramsObj: Record<string, string> = {};
      searchParams.forEach((value, key) => { paramsObj[key] = value; });

      const validation = productionQuerySchema.safeParse(paramsObj);
      if (!validation.success) {
        return handleError(validation.error);
      }

      const params = validation.data;
      const sanitizedSearch = params.search ? sanitize(params.search) : undefined;

      logger.info('Fetching work orders', {
        userId: user.id,
        filters: { ...params, search: sanitizedSearch }
      });

      // Build where clause
      const where: any = {};

      if (sanitizedSearch) {
        where.OR = [
          { woNumber: { contains: sanitizedSearch, mode: 'insensitive' } },
          { product: { name: { contains: sanitizedSearch, mode: 'insensitive' } } },
          { product: { sku: { contains: sanitizedSearch, mode: 'insensitive' } } },
        ];
      }

      if (params.status) {
        where.status = params.status;
      }

      if (params.priority) {
        where.priority = params.priority;
      }

      if (params.workCenter) {
        where.workCenter = params.workCenter;
      }

      // Get total count
      const total = await prisma.workOrder.count({ where });

      // Get work orders
      const workOrders = await prisma.workOrder.findMany({
        where,
        skip: params.view === 'kanban' ? 0 : (params.page - 1) * params.pageSize,
        take: params.view === 'kanban' ? 100 : params.pageSize,
        orderBy: { dueDate: 'asc' },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              revision: true,
              basePrice: true,
              assemblyHours: true,
            }
          },
          operations: {
            orderBy: { operationSeq: 'asc' },
            select: {
              id: true,
              operationSeq: true,
              operationName: true,
              workCenter: true,
              plannedHours: true,
              actualHours: true,
              status: true,
              startTime: true,
              endTime: true,
            }
          },
          materials: {
            include: {
              part: {
                select: {
                  id: true,
                  partNumber: true,
                  name: true,
                  unitCost: true,
                }
              }
            }
          },
        },
      });

      // Format work orders
      const formattedOrders = workOrders.map(wo => {
        const totalQty = Number(wo.quantity);
        const completedQty = Number(wo.completedQty);
        const progress = totalQty > 0 ? Math.round((completedQty / totalQty) * 100) : 0;

        const totalOps = wo.operations.length;
        const completedOps = wo.operations.filter(op => op.status === 'completed').length;
        const currentOp = wo.operations.find(op => op.status === 'in_progress')
          || wo.operations.find(op => op.status === 'pending');

        const plannedHours = wo.operations.reduce((sum, op) => sum + Number(op.plannedHours), 0);
        const actualHours = wo.operations.reduce((sum, op) => sum + Number(op.actualHours), 0);

        const isOverdue = wo.dueDate && new Date(wo.dueDate) < new Date() && wo.status !== 'COMPLETED';

        return {
          id: wo.id,
          woNumber: wo.woNumber,
          product: wo.product,
          quantity: totalQty,
          completedQty,
          scrapQty: Number(wo.scrapQty),
          progress,
          startDate: wo.startDate,
          dueDate: wo.dueDate,
          completionDate: wo.completionDate,
          isOverdue,
          status: wo.status,
          priority: wo.priority,
          workCenter: wo.workCenter,
          operations: wo.operations,
          totalOperations: totalOps,
          completedOperations: completedOps,
          currentOperation: currentOp?.operationName || null,
          operationProgress: totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : 0,
          plannedHours,
          actualHours,
          efficiency: plannedHours > 0 ? Math.round((plannedHours / Math.max(actualHours, plannedHours)) * 100) : 0,
          materials: wo.materials.map(m => ({
            id: m.id,
            part: m.part,
            requiredQty: Number(m.requiredQty),
            issuedQty: Number(m.issuedQty),
            scrapQty: Number(m.scrapQty),
            status: m.status,
          })),
          materialCount: wo.materials.length,
          notes: wo.notes,
          createdAt: wo.createdAt,
          updatedAt: wo.updatedAt,
        };
      });

      // Group by status for Kanban view
      let kanbanData = null;
      if (params.view === 'kanban') {
        kanbanData = {
          RELEASED: formattedOrders.filter(o => o.status === 'RELEASED'),
          SCHEDULED: formattedOrders.filter(o => o.status === 'SCHEDULED'),
          IN_PROGRESS: formattedOrders.filter(o => o.status === 'IN_PROGRESS'),
          ON_HOLD: formattedOrders.filter(o => o.status === 'ON_HOLD'),
          COMPLETED: formattedOrders.filter(o => o.status === 'COMPLETED'),
        };
      }

      // Get KPIs
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [activeCount, completedMTD] = await Promise.all([
        prisma.workOrder.count({ where: { status: { in: ['RELEASED', 'IN_PROGRESS'] } } }),
        prisma.workOrder.count({
          where: {
            status: 'COMPLETED',
            completionDate: { gte: startOfMonth }
          }
        }),
      ]);

      const duration = performance.now() - startTime;
      logger.info('Work orders fetched', { userId: user.id, total, durationMs: duration.toFixed(2) });

      return successResponse({
        items: params.view === 'kanban' ? null : formattedOrders,
        kanban: kanbanData,
        total,
        page: params.page,
        pageSize: params.pageSize,
        totalPages: Math.ceil(total / params.pageSize),
        kpis: {
          activeWorkOrders: activeCount,
          completedMTD,
        },
      });
    } catch (error) {
      logger.logError(error as Error, { context: 'production-list' });
      return handleError(error);
    }
  },
  { permission: 'production:read' }
);

// =============================================================================
// POST - Create work order (requires production:write permission)
// =============================================================================

export const POST = withAuth(
  async (request: NextRequest, { user }: { params: any; user: AuthUser }) => {
    const startTime = performance.now();

    try {
      const body = await request.json();

      // Validate input
      const validation = workOrderCreateSchema.safeParse(body);
      if (!validation.success) {
        return handleError(validation.error);
      }

      const data = validation.data;
      const sanitizedData = sanitizeObject(data);

      logger.info('Creating work order', {
        userId: user.id,
        productId: sanitizedData.productId
      });

      // Generate WO number
      const lastWO = await prisma.workOrder.findFirst({
        orderBy: { woNumber: 'desc' }
      });
      const nextNumber = lastWO
        ? parseInt(lastWO.woNumber.replace('WO-', '')) + 1
        : 1;
      const woNumber = `WO-${String(nextNumber).padStart(6, '0')}`;

      // Get product BOM for materials
      const bomLines = await prisma.bomLine.findMany({
        where: { productId: sanitizedData.productId },
        include: { part: true }
      });

      // Create work order with materials from BOM
      const workOrder = await prisma.workOrder.create({
        data: {
          woNumber,
          productId: sanitizedData.productId,
          quantity: sanitizedData.quantity,
          startDate: sanitizedData.startDate ? new Date(sanitizedData.startDate) : null,
          dueDate: sanitizedData.dueDate ? new Date(sanitizedData.dueDate) : null,
          status: sanitizedData.status,
          priority: sanitizedData.priority,
          workCenter: sanitizedData.workCenter,
          notes: sanitizedData.notes,
          createdBy: user.id,
          materials: {
            create: bomLines.map(bom => ({
              partId: bom.partId,
              requiredQty: Number(bom.quantity) * sanitizedData.quantity,
              status: 'pending',
            })),
          },
          operations: sanitizedData.operations ? {
            create: sanitizedData.operations.map(op => ({
              operationSeq: op.seq,
              operationName: op.name,
              workCenter: op.workCenter,
              plannedHours: op.plannedHours,
              status: 'pending',
            })),
          } : undefined,
        },
        include: {
          product: true,
          materials: { include: { part: true } },
          operations: true,
        },
      });

      // Audit log
      logger.audit('CREATE', 'workOrder', workOrder.id, {
        woNumber: workOrder.woNumber,
        productId: workOrder.productId,
        quantity: sanitizedData.quantity,
        userId: user.id
      });

      const duration = performance.now() - startTime;
      logger.info('Work order created', {
        userId: user.id,
        workOrderId: workOrder.id,
        woNumber: workOrder.woNumber,
        durationMs: duration.toFixed(2)
      });

      return successResponse(workOrder, 'Work order created successfully', 201);
    } catch (error) {
      logger.logError(error as Error, { context: 'production-create' });
      return handleError(error);
    }
  },
  { permission: 'production:write' }
);
