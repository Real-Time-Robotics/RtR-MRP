// =============================================================================
// RTR MRP - PARTS API ROUTE (SECURED)
// /api/v2/parts/route.ts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, type AuthUser } from '@/lib/auth/middleware';
import { handleError, paginatedResponse, successResponse, createdResponse } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { PartQuerySchema, PartCreateSchema, parseSearchParams, validateRequest } from '@/lib/validation/schemas';
import { sanitizeSearchQuery } from '@/lib/security/sanitize';

// GET - List parts (requires authentication + read permission)
export const GET = withAuth(
  async (request: NextRequest, { user }: { params: any; user: AuthUser }) => {
    try {
      const { searchParams } = new URL(request.url);

      // Validate query parameters
      const validation = parseSearchParams(PartQuerySchema, searchParams);
      if (!validation.success) {
        return validation.error;
      }

      const {
        page = 1,
        pageSize = 20,
        search = '',
        category,
        status,
        type,
        itar,
        stockStatus,
        sortBy = 'partNumber',
        sortOrder = 'asc',
      } = validation.data;

      // Sanitize search input
      const sanitizedSearch = search ? sanitizeSearchQuery(search) : '';

      logger.info('Fetching parts', { userId: user.id, search: sanitizedSearch, page });

      // Build where clause with sanitized inputs
      const where: any = {};

      if (sanitizedSearch) {
        where.OR = [
          { partNumber: { contains: sanitizedSearch, mode: 'insensitive' } },
          { name: { contains: sanitizedSearch, mode: 'insensitive' } },
          { description: { contains: sanitizedSearch, mode: 'insensitive' } },
          { manufacturer: { contains: sanitizedSearch, mode: 'insensitive' } },
          { manufacturerPn: { contains: sanitizedSearch, mode: 'insensitive' } },
        ];
      }

      if (category) {
        where.category = category;
      }

      if (status) {
        where.lifecycleStatus = status;
      }

      if (type) {
        where.makeOrBuy = type;
      }

      if (itar === 'true') {
        where.itarControlled = true;
      } else if (itar === 'false') {
        where.itarControlled = false;
      }

      // Get total count
      const total = await prisma.part.count({ where });

      // Validate sortBy to prevent injection
      const allowedSortFields = ['partNumber', 'name', 'category', 'unitCost', 'createdAt', 'updatedAt'];
      const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'partNumber';

      // Get parts with inventory info
      const parts = await prisma.part.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [safeSortBy]: sortOrder },
        include: {
          partSuppliers: {
            include: {
              supplier: {
                select: { id: true, code: true, name: true, country: true }
              }
            },
            take: 1,
            orderBy: { isPreferred: 'desc' }
          },
          inventory: {
            select: {
              quantity: true,
              reservedQty: true,
              warehouseId: true,
            }
          },
          _count: {
            select: {
              partSuppliers: true,
            }
          }
        },
      });

      // Calculate stock status for each part
      const partsWithStatus = parts.map(part => {
        const totalQty = part.inventory.reduce((sum, inv) => sum + Number(inv.quantity), 0);
        const reservedQty = part.inventory.reduce((sum, inv) => sum + Number(inv.reservedQty), 0);
        const availableQty = totalQty - reservedQty;

        let partStockStatus = 'IN_STOCK';
        if (totalQty <= 0) {
          partStockStatus = 'OUT_OF_STOCK';
        } else if (totalQty <= part.minStockLevel) {
          partStockStatus = 'CRITICAL';
        } else if (totalQty <= part.reorderPoint) {
          partStockStatus = 'LOW_STOCK';
        }

        const primarySupplier = part.partSuppliers[0]?.supplier || null;

        return {
          id: part.id,
          partNumber: part.partNumber,
          name: part.name,
          description: part.description,
          category: part.category,
          subCategory: part.subCategory,
          partType: part.partType,
          unit: part.unit,
          revision: part.revision,
          ndaaCompliant: part.ndaaCompliant,
          itarControlled: part.itarControlled,
          rohsCompliant: part.rohsCompliant,
          countryOfOrigin: part.countryOfOrigin,
          hsCode: part.hsCode,
          eccn: part.eccn,
          lotControl: part.lotControl,
          serialControl: part.serialControl,
          shelfLifeDays: part.shelfLifeDays,
          lifecycleStatus: part.lifecycleStatus,
          makeOrBuy: part.makeOrBuy,
          critical: part.isCritical,
          onHand: totalQty,
          available: availableQty,
          minStock: part.minStockLevel,
          reorderPoint: part.reorderPoint,
          safetyStock: part.safetyStock,
          stockStatus: partStockStatus,
          unitCost: Number(part.unitCost),
          standardCost: part.standardCost ? Number(part.standardCost) : null,
          primarySupplier,
          leadTimeDays: part.leadTimeDays,
          manufacturer: part.manufacturer,
          manufacturerPn: part.manufacturerPn,
          drawingNumber: part.drawingNumber,
          supplierCount: part._count.partSuppliers,
          createdAt: part.createdAt,
          updatedAt: part.updatedAt,
        };
      });

      // Filter by stock status if specified
      let filteredParts = partsWithStatus;
      if (stockStatus) {
        filteredParts = partsWithStatus.filter(p => p.stockStatus === stockStatus);
      }

      // Get categories for filters
      const categories = await prisma.part.groupBy({
        by: ['category'],
        _count: true,
      });

      return paginatedResponse(
        filteredParts,
        stockStatus ? filteredParts.length : total,
        page,
        pageSize,
        {
          filters: {
            categories: categories.map(c => ({ value: c.category, count: c._count })),
          }
        }
      );

    } catch (error) {
      return handleError(error);
    }
  },
  { permission: 'parts:read' }
);

// POST - Create new part (requires authentication + write permission)
export const POST = withAuth(
  async (request: NextRequest, { user }: { params: any; user: AuthUser }) => {
    try {
      const body = await request.json();

      // Validate input
      const validation = validateRequest(PartCreateSchema, body);
      if (!validation.success) {
        return validation.error;
      }

      const data = validation.data;

      logger.info('Creating part', { userId: user.id, partNumber: data.partNumber });

      // Create new part with validated data
      const part = await prisma.part.create({
        data: {
          partNumber: data.partNumber,
          name: data.name,
          description: data.description,
          category: data.category,
          subCategory: data.subCategory,
          partType: data.partType,
          unit: data.unit || 'pcs',
          ndaaCompliant: data.ndaaCompliant ?? true,
          itarControlled: data.itarControlled ?? false,
          rohsCompliant: data.rohsCompliant ?? true,
          reachCompliant: data.reachCompliant ?? true,
          countryOfOrigin: data.countryOfOrigin,
          hsCode: data.hsCode,
          eccn: data.eccn,
          lotControl: data.lotControl ?? false,
          serialControl: data.serialControl ?? false,
          shelfLifeDays: data.shelfLifeDays,
          inspectionRequired: data.inspectionRequired ?? true,
          minStockLevel: data.minStock ?? 0,
          reorderPoint: data.reorderPoint ?? 0,
          safetyStock: data.safetyStock ?? 0,
          leadTimeDays: data.leadTimeDays ?? 14,
          isCritical: data.critical ?? false,
          unitCost: data.unitCost ?? 0,
          standardCost: data.standardCost,
          makeOrBuy: data.makeOrBuy ?? 'BUY',
          manufacturer: data.manufacturer,
          manufacturerPn: data.manufacturerPn,
          drawingNumber: data.drawingNumber,
        },
      });

      logger.audit('create', 'part', part.id, { userId: user.id, partNumber: part.partNumber });

      return createdResponse(part);

    } catch (error) {
      return handleError(error);
    }
  },
  { permission: 'parts:write' }
);
