// =============================================================================
// RTR MRP - BOM (BILL OF MATERIALS) API ROUTE (SECURED)
// /api/v2/bom/route.ts
// =============================================================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthUser } from '@/lib/auth/middleware';
import { sanitize, sanitizeObject } from '@/lib/security/sanitize';
import { handleError, successResponse, NotFoundError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// =============================================================================
// SCHEMAS
// =============================================================================

const bomQuerySchema = z.object({
  productId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  includeTree: z.enum(['true', 'false']).default('true'),
});

const bomLineCreateSchema = z.object({
  bomId: z.string().min(1),
  partId: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().max(20).default('pcs'),
  module: z.string().max(50).optional(),
  critical: z.boolean().default(false),
  notes: z.string().max(500).optional(),
  findNumber: z.number().int().positive().optional(),
  referenceDesignator: z.string().max(50).optional(),
  scrapPercent: z.number().min(0).max(100).default(0),
  operationSeq: z.number().int().positive().optional(),
  revision: z.string().max(10).default('A'),
  effectivityDate: z.string().datetime().optional(),
  alternateGroup: z.string().max(20).optional(),
  isPrimary: z.boolean().default(true),
  bomType: z.enum(['ENGINEERING', 'MANUFACTURING', 'CONFIGURABLE', 'PLANNING', 'SERVICE']).default('MANUFACTURING'),
  subAssembly: z.boolean().default(false),
  phantom: z.boolean().default(false),
  sequence: z.number().int().min(0).default(0),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  positionZ: z.number().optional(),
});

const bomLineUpdateSchema = bomLineCreateSchema.partial().extend({
  id: z.string().min(1),
});

// =============================================================================
// GET - List BOMs or get BOM tree (requires bom:read permission)
// =============================================================================

export const GET = withAuth(
  async (request: NextRequest, { user }: { params: any; user: AuthUser }) => {
    const startTime = performance.now();

    try {
      const { searchParams } = new URL(request.url);

      // Validate query parameters
      const paramsObj: Record<string, string> = {};
      searchParams.forEach((value, key) => { paramsObj[key] = value; });

      const validation = bomQuerySchema.safeParse(paramsObj);
      if (!validation.success) {
        return handleError(validation.error);
      }

      const params = validation.data;
      const includeTree = params.includeTree === 'true';

      // If productId is provided, return full BOM tree
      if (params.productId) {
        logger.info('Fetching BOM tree', {
          userId: user.id,
          productId: params.productId
        });

        const product = await prisma.product.findUnique({
          where: { id: params.productId },
          include: {
            bomHeaders: {
              where: { status: 'active' },
              orderBy: { effectiveDate: 'desc' },
              take: 1,
              include: {
                bomLines: {
                  orderBy: [{ moduleName: 'asc' }, { sequence: 'asc' }],
                  include: {
                    part: {
                      include: {
                        partSuppliers: {
                          where: { isPreferred: true },
                          include: {
                            supplier: {
                              select: { id: true, code: true, name: true, leadTimeDays: true }
                            }
                          },
                          take: 1
                        },
                        inventory: {
                          select: { quantity: true, reservedQty: true }
                        },
                        partAlternates: {
                          include: {
                            alternatePart: {
                              select: { id: true, partNumber: true, name: true, unitCost: true }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });

        if (!product) {
          throw new NotFoundError('Product', params.productId);
        }

        // Get active BOM header and its lines
        const activeBom = product.bomHeaders[0];
        const allBomLines = activeBom?.bomLines || [];

        // Format BOM lines
        const bomLines = allBomLines.map(line => {
          const part = line.part;
          const totalQty = part.inventory.reduce((sum, inv) => sum + Number(inv.quantity), 0);
          const availableQty = part.inventory.reduce((sum, inv) => sum + Number(inv.quantity) - Number(inv.reservedQty), 0);
          const extendedCost = Number(line.quantity) * Number(part.unitCost);
          const primarySupplier = part.partSuppliers[0]?.supplier;

          return {
            id: line.id,
            findNumber: line.findNumber,
            referenceDesignator: line.referenceDesignator,
            sequence: line.sequence,
            partId: part.id,
            partNumber: part.partNumber,
            partName: part.name,
            partDescription: part.description,
            quantity: Number(line.quantity),
            unit: line.unit,
            scrapPercent: Number(line.scrapPercent),
            effectiveQty: Number(line.quantity) * (1 + Number(line.scrapPercent) / 100),
            module: line.moduleName,
            bomType: line.bomType,
            subAssembly: line.subAssembly,
            phantom: line.phantom,
            critical: line.isCritical || part.isCritical,
            isPrimary: line.isPrimary,
            revision: line.revision,
            effectivityDate: line.effectivityDate,
            obsoleteDate: line.obsoleteDate,
            alternateGroup: line.alternateGroup,
            alternates: part.partAlternates.map(alt => ({
              id: alt.alternatePart.id,
              partNumber: alt.alternatePart.partNumber,
              name: alt.alternatePart.name,
              unitCost: Number(alt.alternatePart.unitCost),
              type: alt.alternateType,
              priority: alt.priority,
            })),
            unitCost: Number(part.unitCost),
            extendedCost,
            onHand: totalQty,
            available: availableQty,
            shortage: Math.max(0, Number(line.quantity) - availableQty),
            supplier: primarySupplier,
            leadTimeDays: part.leadTimeDays,
            positionX: line.positionX ? Number(line.positionX) : null,
            positionY: line.positionY ? Number(line.positionY) : null,
            positionZ: line.positionZ ? Number(line.positionZ) : null,
            operationSeq: line.operationSeq,
            notes: line.notes,
          };
        });

        // Group by module for tree structure
        const moduleGroups: Record<string, any[]> = {};
        bomLines.forEach(line => {
          const modName = line.module || 'Unassigned';
          if (!moduleGroups[modName]) {
            moduleGroups[modName] = [];
          }
          moduleGroups[modName].push(line);
        });

        // Calculate totals
        const totalCost = bomLines.reduce((sum, line) => sum + line.extendedCost, 0);
        const totalParts = bomLines.length;
        const criticalCount = bomLines.filter(l => l.critical).length;
        const shortageCount = bomLines.filter(l => l.shortage > 0).length;
        const longestLeadTime = Math.max(...bomLines.map(l => l.leadTimeDays || 0));

        const costByModule = Object.entries(moduleGroups).map(([module, lines]) => ({
          module,
          cost: lines.reduce((sum, l) => sum + l.extendedCost, 0),
          partCount: lines.length,
        }));

        const duration = performance.now() - startTime;
        logger.info('BOM tree fetched', { userId: user.id, productId: params.productId, durationMs: duration.toFixed(2) });

        return successResponse({
          product: {
            id: product.id,
            sku: product.sku,
            name: product.name,
            description: product.description,
            basePrice: Number(product.basePrice || 0),
            assemblyHours: product.assemblyHours ? Number(product.assemblyHours) : null,
          },
          bomLines,
          tree: includeTree ? moduleGroups : undefined,
          summary: {
            totalCost,
            totalParts,
            criticalCount,
            shortageCount,
            longestLeadTime,
            margin: Number(product.basePrice) > 0
              ? ((Number(product.basePrice) - totalCost) / Number(product.basePrice) * 100).toFixed(1)
              : 0,
            costByModule,
          },
        });
      }

      // Otherwise, list all products with BOMs
      const sanitizedSearch = params.search ? sanitize(params.search) : undefined;

      logger.info('Fetching BOM list', {
        userId: user.id,
        search: sanitizedSearch
      });

      const where: any = {};
      if (sanitizedSearch) {
        where.OR = [
          { sku: { contains: sanitizedSearch, mode: 'insensitive' } },
          { name: { contains: sanitizedSearch, mode: 'insensitive' } },
        ];
      }

      const products = await prisma.product.findMany({
        where,
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        orderBy: { sku: 'asc' },
        include: {
          bomHeaders: {
            where: { status: 'active' },
            orderBy: { effectiveDate: 'desc' },
            take: 1,
            include: {
              bomLines: {
                include: {
                  part: {
                    select: { unitCost: true, isCritical: true }
                  }
                }
              }
            }
          },
          _count: {
            select: { bomHeaders: true, workOrders: true }
          }
        },
      });

      const productsWithBOM = products.map(product => {
        const activeBom = product.bomHeaders[0];
        const bomLines = activeBom?.bomLines || [];

        const totalCost = bomLines.reduce((sum, line) => {
          return sum + (Number(line.quantity) * Number(line.part.unitCost));
        }, 0);

        const criticalParts = bomLines.filter(line => line.isCritical || line.part.isCritical).length;
        const modules = Array.from(new Set(bomLines.map(l => l.moduleName).filter(Boolean)));

        return {
          id: product.id,
          sku: product.sku,
          name: product.name,
          description: product.description,
          status: product.status,
          basePrice: Number(product.basePrice || 0),
          bomHeaderCount: product._count.bomHeaders,
          bomLineCount: bomLines.length,
          workOrderCount: product._count.workOrders,
          totalBOMCost: totalCost,
          criticalParts,
          modules,
          margin: Number(product.basePrice) > 0
            ? ((Number(product.basePrice) - totalCost) / Number(product.basePrice) * 100).toFixed(1)
            : 0,
          assemblyHours: product.assemblyHours ? Number(product.assemblyHours) : null,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        };
      });

      const total = await prisma.product.count({ where });

      const duration = performance.now() - startTime;
      logger.info('BOM list fetched', { userId: user.id, total, durationMs: duration.toFixed(2) });

      return successResponse({
        items: productsWithBOM,
        total,
        page: params.page,
        pageSize: params.pageSize,
        totalPages: Math.ceil(total / params.pageSize),
      });
    } catch (error) {
      logger.logError(error as Error, { context: 'bom-list' });
      return handleError(error);
    }
  },
  { permission: 'bom:read' }
);

// =============================================================================
// POST - Add BOM line (requires bom:write permission)
// =============================================================================

export const POST = withAuth(
  async (request: NextRequest, { user }: { params: any; user: AuthUser }) => {
    const startTime = performance.now();

    try {
      const body = await request.json();

      const validation = bomLineCreateSchema.safeParse(body);
      if (!validation.success) {
        return handleError(validation.error);
      }

      const data = validation.data;
      const sanitizedData = sanitizeObject(data);

      logger.info('Creating BOM line', {
        userId: user.id,
        bomId: sanitizedData.bomId,
        partId: sanitizedData.partId
      });

      const part = await prisma.part.findUnique({
        where: { id: sanitizedData.partId },
        select: { unitCost: true }
      });

      // Get the next line number for this BOM
      const lastLine = await prisma.bomLine.findFirst({
        where: { bomId: sanitizedData.bomId },
        orderBy: { lineNumber: 'desc' }
      });
      const nextLineNumber = (lastLine?.lineNumber || 0) + 1;

      const bomLine = await prisma.bomLine.create({
        data: {
          bomId: sanitizedData.bomId,
          lineNumber: nextLineNumber,
          partId: sanitizedData.partId,
          quantity: sanitizedData.quantity,
          unit: sanitizedData.unit,
          moduleName: sanitizedData.module,
          isCritical: sanitizedData.critical,
          notes: sanitizedData.notes,
          findNumber: sanitizedData.findNumber,
          referenceDesignator: sanitizedData.referenceDesignator,
          scrapPercent: sanitizedData.scrapPercent,
          operationSeq: sanitizedData.operationSeq,
          revision: sanitizedData.revision,
          effectivityDate: sanitizedData.effectivityDate ? new Date(sanitizedData.effectivityDate) : null,
          alternateGroup: sanitizedData.alternateGroup,
          isPrimary: sanitizedData.isPrimary,
          bomType: sanitizedData.bomType,
          subAssembly: sanitizedData.subAssembly,
          phantom: sanitizedData.phantom,
          extendedCost: part ? Number(sanitizedData.quantity) * Number(part.unitCost) : null,
          sequence: sanitizedData.sequence,
          positionX: sanitizedData.positionX,
          positionY: sanitizedData.positionY,
          positionZ: sanitizedData.positionZ,
        },
        include: {
          part: true,
          bom: true,
        },
      });

      logger.audit('CREATE', 'bomLine', bomLine.id, {
        bomId: sanitizedData.bomId,
        partId: sanitizedData.partId,
        userId: user.id
      });

      const duration = performance.now() - startTime;
      logger.info('BOM line created', { userId: user.id, bomLineId: bomLine.id, durationMs: duration.toFixed(2) });

      return successResponse(bomLine, 'BOM line created successfully', 201);
    } catch (error) {
      logger.logError(error as Error, { context: 'bom-create' });
      return handleError(error);
    }
  },
  { permission: 'bom:write' }
);

// =============================================================================
// PUT - Update BOM line (requires bom:write permission)
// =============================================================================

export const PUT = withAuth(
  async (request: NextRequest, { user }: { params: any; user: AuthUser }) => {
    const startTime = performance.now();

    try {
      const body = await request.json();

      const validation = bomLineUpdateSchema.safeParse(body);
      if (!validation.success) {
        return handleError(validation.error);
      }

      const { id, ...updateData } = validation.data;
      const sanitizedData = sanitizeObject(updateData);

      logger.info('Updating BOM line', { userId: user.id, bomLineId: id });

      // Recalculate extended cost if quantity changed
      if (sanitizedData.quantity) {
        const bomLine = await prisma.bomLine.findUnique({
          where: { id },
          include: { part: { select: { unitCost: true } } }
        });
        if (bomLine?.part) {
          (sanitizedData as any).extendedCost = Number(sanitizedData.quantity) * Number(bomLine.part.unitCost);
        }
      }

      const updated = await prisma.bomLine.update({
        where: { id },
        data: sanitizedData,
        include: {
          part: true,
          bom: true,
        },
      });

      logger.audit('UPDATE', 'bomLine', id, { userId: user.id });

      const duration = performance.now() - startTime;
      logger.info('BOM line updated', { userId: user.id, bomLineId: id, durationMs: duration.toFixed(2) });

      return successResponse(updated, 'BOM line updated successfully');
    } catch (error) {
      logger.logError(error as Error, { context: 'bom-update' });
      return handleError(error);
    }
  },
  { permission: 'bom:write' }
);

// =============================================================================
// DELETE - Remove BOM line (requires bom:write permission)
// =============================================================================

export const DELETE = withAuth(
  async (request: NextRequest, { user }: { params: any; user: AuthUser }) => {
    const startTime = performance.now();

    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return handleError(new Error('BOM line ID required'));
      }

      logger.info('Deleting BOM line', { userId: user.id, bomLineId: id });

      await prisma.bomLine.delete({
        where: { id },
      });

      logger.audit('DELETE', 'bomLine', id, { userId: user.id });

      const duration = performance.now() - startTime;
      logger.info('BOM line deleted', { userId: user.id, bomLineId: id, durationMs: duration.toFixed(2) });

      return successResponse(null, 'BOM line deleted');
    } catch (error) {
      logger.logError(error as Error, { context: 'bom-delete' });
      return handleError(error);
    }
  },
  { permission: 'bom:write' }
);
