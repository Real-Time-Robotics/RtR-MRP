// =============================================================================
// RTR MRP - INVENTORY API ROUTE (SECURED)
// /api/v2/inventory/route.ts
// =============================================================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthUser } from '@/lib/auth/middleware';
import { sanitize, sanitizeObject } from '@/lib/security/sanitize';
import { handleError, successResponse, ValidationError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// =============================================================================
// SCHEMAS
// =============================================================================

const inventoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  warehouse: z.string().max(50).optional(),
  category: z.string().max(50).optional(),
  stockStatus: z.enum(['IN_STOCK', 'LOW_STOCK', 'CRITICAL', 'OUT_OF_STOCK', 'OVERSTOCK']).optional(),
  sortBy: z.string().default('partNumber'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

const inventoryActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('receive'),
    partId: z.string().min(1),
    warehouseId: z.string().min(1),
    quantity: z.number().positive(),
    lotNumber: z.string().max(50).optional(),
    serialNumber: z.string().max(50).optional(),
    notes: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal('issue'),
    partId: z.string().min(1),
    warehouseId: z.string().min(1),
    quantity: z.number().positive(),
    lotNumber: z.string().max(50).optional(),
    notes: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal('reserve'),
    partId: z.string().min(1),
    warehouseId: z.string().min(1),
    quantity: z.number().positive(),
    notes: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal('transfer'),
    partId: z.string().min(1),
    warehouseId: z.string().min(1),
    toWarehouseId: z.string().min(1),
    quantity: z.number().positive(),
    lotNumber: z.string().max(50).optional(),
    notes: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal('adjust'),
    partId: z.string().min(1),
    warehouseId: z.string().min(1),
    quantity: z.number().min(0),
    lotNumber: z.string().max(50).optional(),
    notes: z.string().max(500).optional(),
  }),
]);

// =============================================================================
// GET - List inventory (requires inventory:read permission)
// =============================================================================

export const GET = withAuth(
  async (request: NextRequest, { user }: { params: any; user: AuthUser }) => {
    const startTime = performance.now();

    try {
      const { searchParams } = new URL(request.url);

      // Validate query parameters
      const paramsObj: Record<string, string> = {};
      searchParams.forEach((value, key) => { paramsObj[key] = value; });

      const validation = inventoryQuerySchema.safeParse(paramsObj);
      if (!validation.success) {
        return handleError(validation.error);
      }

      const params = validation.data;
      const sanitizedSearch = params.search ? sanitize(params.search) : undefined;

      logger.info('Fetching inventory', {
        userId: user.id,
        filters: { ...params, search: sanitizedSearch }
      });

      // Build where clause for parts
      const partWhere: any = {};
      if (sanitizedSearch) {
        partWhere.OR = [
          { partNumber: { contains: sanitizedSearch, mode: 'insensitive' } },
          { name: { contains: sanitizedSearch, mode: 'insensitive' } },
        ];
      }
      if (params.category) {
        partWhere.category = params.category;
      }

      // Build where clause for inventory
      const inventoryWhere: any = {};
      if (params.warehouse) {
        inventoryWhere.warehouseId = params.warehouse;
      }

      // Get warehouses for filter
      const warehouses = await prisma.warehouse.findMany({
        select: { id: true, code: true, name: true, type: true },
        where: { status: 'active' },
      });

      // Get inventory with part details
      const inventory = await prisma.inventory.findMany({
        where: {
          ...inventoryWhere,
          part: partWhere,
        },
        include: {
          part: {
            select: {
              id: true,
              partNumber: true,
              name: true,
              category: true,
              unit: true,
              minStockLevel: true,
              maxStock: true,
              reorderPoint: true,
              safetyStock: true,
              unitCost: true,
              isCritical: true,
              lotControl: true,
              serialControl: true,
              shelfLifeDays: true,
            }
          },
          warehouse: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
            }
          },
        },
      });

      // Format and calculate stock status
      const formattedInventory = inventory.map(inv => {
        const quantity = Number(inv.quantity);
        const reserved = Number(inv.reservedQty);
        const available = quantity - reserved; // Calculate available
        const minStockLevel = inv.part.minStockLevel;
        const reorderPoint = inv.part.reorderPoint;
        const maxStock = inv.part.maxStock;
        const unitCost = Number(inv.part.unitCost);

        let status = 'IN_STOCK';
        let statusColor = 'success';
        if (quantity <= 0) {
          status = 'OUT_OF_STOCK';
          statusColor = 'danger';
        } else if (quantity <= minStockLevel) {
          status = 'CRITICAL';
          statusColor = 'danger';
        } else if (quantity <= reorderPoint) {
          status = 'LOW_STOCK';
          statusColor = 'warning';
        } else if (maxStock && quantity >= maxStock) {
          status = 'OVERSTOCK';
          statusColor = 'info';
        }

        const isExpired = inv.expiryDate && new Date(inv.expiryDate) < new Date();
        const isExpiringSoon = inv.expiryDate &&
          new Date(inv.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        return {
          id: inv.id,
          partId: inv.part.id,
          partNumber: inv.part.partNumber,
          partName: inv.part.name,
          category: inv.part.category,
          unit: inv.part.unit,
          isCritical: inv.part.isCritical,
          warehouse: inv.warehouse,
          locationCode: inv.locationCode,
          quantity,
          reservedQty: reserved,
          availableQty: available,
          minStockLevel,
          maxStock,
          reorderPoint,
          safetyStock: inv.part.safetyStock,
          stockStatus: status,
          statusColor,
          lotNumber: inv.lotNumber,
          lotControl: inv.part.lotControl,
          serialControl: inv.part.serialControl,
          expiryDate: inv.expiryDate,
          lastCountDate: inv.lastCountDate,
          isExpired,
          isExpiringSoon,
          daysUntilExpiry: inv.expiryDate
            ? Math.ceil((new Date(inv.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null,
          unitCost,
          totalValue: quantity * unitCost, // Calculate total value
          updatedAt: inv.updatedAt,
        };
      });

      // Filter by stock status if specified
      let filteredInventory = formattedInventory;
      if (params.stockStatus) {
        filteredInventory = formattedInventory.filter(i => i.stockStatus === params.stockStatus);
      }

      // Paginate
      const total = filteredInventory.length;
      const paginatedInventory = filteredInventory.slice(
        (params.page - 1) * params.pageSize,
        params.page * params.pageSize
      );

      // Calculate KPIs
      const totalValue = formattedInventory.reduce((sum, i) => sum + i.totalValue, 0);
      const lowStockCount = formattedInventory.filter(i =>
        i.stockStatus === 'LOW_STOCK' || i.stockStatus === 'CRITICAL'
      ).length;
      const outOfStockCount = formattedInventory.filter(i => i.stockStatus === 'OUT_OF_STOCK').length;
      const expiringCount = formattedInventory.filter(i => i.isExpiringSoon).length;

      // Get categories for filter
      const categories = await prisma.part.groupBy({
        by: ['category'],
        _count: true,
      });

      // Stock status summary
      const stockSummary = {
        inStock: formattedInventory.filter(i => i.stockStatus === 'IN_STOCK').length,
        lowStock: formattedInventory.filter(i => i.stockStatus === 'LOW_STOCK').length,
        critical: formattedInventory.filter(i => i.stockStatus === 'CRITICAL').length,
        outOfStock: outOfStockCount,
        overstock: formattedInventory.filter(i => i.stockStatus === 'OVERSTOCK').length,
      };

      const duration = performance.now() - startTime;
      logger.info('Inventory fetched', { userId: user.id, total, durationMs: duration.toFixed(2) });

      return successResponse({
        items: paginatedInventory,
        total,
        page: params.page,
        pageSize: params.pageSize,
        totalPages: Math.ceil(total / params.pageSize),
        kpis: {
          totalValue,
          totalItems: formattedInventory.length,
          lowStockCount,
          outOfStockCount,
          expiringCount,
        },
        stockSummary,
        filters: {
          warehouses: warehouses.map(w => ({ value: w.id, label: w.name, code: w.code })),
          categories: categories.map(c => ({ value: c.category, count: c._count })),
        },
      });
    } catch (error) {
      logger.logError(error as Error, { context: 'inventory-list' });
      return handleError(error);
    }
  },
  { permission: 'inventory:read' }
);

// =============================================================================
// POST - Inventory actions (requires inventory:write permission)
// =============================================================================

export const POST = withAuth(
  async (request: NextRequest, { user }: { params: any; user: AuthUser }) => {
    const startTime = performance.now();

    try {
      const body = await request.json();

      // Validate input
      const validation = inventoryActionSchema.safeParse(body);
      if (!validation.success) {
        return handleError(validation.error);
      }

      const data = validation.data;
      const sanitizedData = sanitizeObject(data);

      logger.info('Processing inventory action', {
        userId: user.id,
        action: sanitizedData.action,
        partId: sanitizedData.partId
      });

      let result;

      switch (sanitizedData.action) {
        case 'receive': {
          const existing = await prisma.inventory.findFirst({
            where: {
              partId: sanitizedData.partId,
              warehouseId: sanitizedData.warehouseId,
              lotNumber: sanitizedData.lotNumber || null
            }
          });

          if (existing) {
            result = await prisma.inventory.update({
              where: { id: existing.id },
              data: {
                quantity: { increment: sanitizedData.quantity },
              },
            });
          } else {
            result = await prisma.inventory.create({
              data: {
                partId: sanitizedData.partId,
                warehouseId: sanitizedData.warehouseId,
                quantity: sanitizedData.quantity,
                reservedQty: 0,
                lotNumber: sanitizedData.lotNumber,
              },
            });
          }

          logger.audit('RECEIVE', 'inventory', result.id, {
            partId: sanitizedData.partId,
            quantity: sanitizedData.quantity,
            userId: user.id
          });
          break;
        }

        case 'issue': {
          const inventory = await prisma.inventory.findFirst({
            where: {
              partId: sanitizedData.partId,
              warehouseId: sanitizedData.warehouseId,
              lotNumber: sanitizedData.lotNumber || null
            }
          });

          const availableQty = inventory ? Number(inventory.quantity) - Number(inventory.reservedQty) : 0;
          if (!inventory || availableQty < sanitizedData.quantity) {
            throw new ValidationError('Insufficient inventory');
          }

          result = await prisma.inventory.update({
            where: { id: inventory.id },
            data: {
              quantity: { decrement: sanitizedData.quantity },
            },
          });

          logger.audit('ISSUE', 'inventory', result.id, {
            partId: sanitizedData.partId,
            quantity: sanitizedData.quantity,
            userId: user.id
          });
          break;
        }

        case 'reserve': {
          const inventory = await prisma.inventory.findFirst({
            where: { partId: sanitizedData.partId, warehouseId: sanitizedData.warehouseId }
          });

          const availableQty = inventory ? Number(inventory.quantity) - Number(inventory.reservedQty) : 0;
          if (!inventory || availableQty < sanitizedData.quantity) {
            throw new ValidationError('Insufficient available inventory');
          }

          result = await prisma.inventory.update({
            where: { id: inventory.id },
            data: {
              reservedQty: { increment: sanitizedData.quantity },
            },
          });

          logger.audit('RESERVE', 'inventory', result.id, {
            partId: sanitizedData.partId,
            quantity: sanitizedData.quantity,
            userId: user.id
          });
          break;
        }

        case 'transfer': {
          const sourceInv = await prisma.inventory.findFirst({
            where: { partId: sanitizedData.partId, warehouseId: sanitizedData.warehouseId }
          });

          const sourceAvailable = sourceInv ? Number(sourceInv.quantity) - Number(sourceInv.reservedQty) : 0;
          if (!sourceInv || sourceAvailable < sanitizedData.quantity) {
            throw new ValidationError('Insufficient inventory for transfer');
          }

          result = await prisma.$transaction([
            prisma.inventory.update({
              where: { id: sourceInv.id },
              data: {
                quantity: { decrement: sanitizedData.quantity },
              },
            }),
            prisma.inventory.upsert({
              where: {
                partId_warehouseId_lotNumber: {
                  partId: sanitizedData.partId,
                  warehouseId: sanitizedData.toWarehouseId,
                  lotNumber: sanitizedData.lotNumber || '',
                }
              },
              create: {
                partId: sanitizedData.partId,
                warehouseId: sanitizedData.toWarehouseId,
                quantity: sanitizedData.quantity,
                reservedQty: 0,
                lotNumber: sanitizedData.lotNumber,
              },
              update: {
                quantity: { increment: sanitizedData.quantity },
              },
            }),
          ]);

          logger.audit('TRANSFER', 'inventory', sourceInv.id, {
            partId: sanitizedData.partId,
            fromWarehouse: sanitizedData.warehouseId,
            toWarehouse: sanitizedData.toWarehouseId,
            quantity: sanitizedData.quantity,
            userId: user.id
          });
          break;
        }

        case 'adjust': {
          const inventory = await prisma.inventory.findFirst({
            where: {
              partId: sanitizedData.partId,
              warehouseId: sanitizedData.warehouseId,
              lotNumber: sanitizedData.lotNumber || null
            }
          });

          if (!inventory) {
            throw new ValidationError('Inventory record not found');
          }

          const oldQty = Number(inventory.quantity);

          result = await prisma.inventory.update({
            where: { id: inventory.id },
            data: {
              quantity: sanitizedData.quantity,
              lastCountDate: new Date(),
            },
          });

          logger.audit('ADJUST', 'inventory', result.id, {
            partId: sanitizedData.partId,
            oldQuantity: oldQty,
            newQuantity: sanitizedData.quantity,
            userId: user.id
          });
          break;
        }
      }

      const duration = performance.now() - startTime;
      logger.info('Inventory action completed', {
        userId: user.id,
        action: sanitizedData.action,
        durationMs: duration.toFixed(2)
      });

      return successResponse(result, `Inventory ${sanitizedData.action} successful`);
    } catch (error) {
      logger.logError(error as Error, { context: 'inventory-action' });
      return handleError(error);
    }
  },
  { permission: 'inventory:write' }
);
