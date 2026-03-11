import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withAuth } from "@/lib/api/with-auth";
import { logger } from "@/lib/logger";
import { rolePermissions, UserRole } from "@/lib/auth/auth-types";
import { auditUpdate, auditDelete } from "@/lib/audit/route-audit";

const partPutSchema = z.object({
  partNumber: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().optional(),
  unitCost: z.number().min(0).optional(),
  standardCost: z.number().min(0).optional(),
  averageCost: z.number().min(0).optional(),
  landedCost: z.number().min(0).optional(),
  freightPercent: z.number().min(0).optional(),
  dutyPercent: z.number().min(0).optional(),
  overheadPercent: z.number().min(0).optional(),
  leadTimeDays: z.number().int().min(0).optional(),
  minStockLevel: z.number().min(0).optional(),
  reorderPoint: z.number().min(0).optional(),
  safetyStock: z.number().min(0).optional(),
  makeOrBuy: z.string().optional(),
  procurementType: z.string().optional(),
  moq: z.number().int().min(1).optional(),
  orderMultiple: z.number().int().min(1).optional(),
  revision: z.string().optional(),
  status: z.string().optional(),
  lifecycleStatus: z.string().optional(),
  isCritical: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  primarySupplierId: z.string().nullable().optional(),
  secondarySupplierIds: z.array(z.string()).optional(),
}).passthrough();

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

import type { Session } from 'next-auth';

// Permission check helper
async function checkPermission(permission: string): Promise<{ authorized: boolean; session: Session | null }> {
  const session = await auth();
  if (!session?.user) return { authorized: false, session: null };

  const userRole = (session.user as { role?: string }).role as UserRole | undefined;
  if (!userRole) return { authorized: false, session };

  const userPermissions = rolePermissions[userRole] || [];
  return { authorized: userPermissions.includes(permission as (typeof userPermissions)[number]), session };
}

// GET - Get single part with full details
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;

    const part = await prisma.part.findUnique({
      where: { id },
      include: {
        planning: true,
        costs: true,
        specs: true,
        compliance: true,
        partSuppliers: {
          include: { supplier: true },
          orderBy: { isPreferred: "desc" },
        },
        partAlternates: {
          include: { alternatePart: true },
          orderBy: { priority: "asc" },
        },
        alternateFor: {
          include: { part: true },
        },
        partDocuments: {
          orderBy: { createdAt: "desc" },
        },
        partRevisions: {
          orderBy: { revisionDate: "desc" },
        },
        partCostsHistory: {
          orderBy: { effectiveDate: "desc" },
          take: 10,
        },
        partCertifications: {
          orderBy: { expiryDate: "asc" },
        },
        inventory: {
          include: { warehouse: true },
        },
        bomLines: {
          include: {
            bom: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (!part) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    // Map primary supplier from partSuppliers relation for detail page
    const primarySupplier = part.partSuppliers?.[0]?.supplier ?? null;

    return NextResponse.json({
      ...part,
      supplier: primarySupplier,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/parts/[id]' });
    return NextResponse.json(
      { error: "Failed to fetch part" },
      { status: 500 }
    );
  }
});

// PUT - Update part
export const PUT = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { authorized } = await checkPermission('orders:edit');
    if (!authorized) {
      return NextResponse.json({ error: "Forbidden - Bạn không có quyền chỉnh sửa" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const parsed = partPutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu không hợp lệ', errors: parsed.error.issues },
        { status: 400 }
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = parsed.data as Record<string, any>;

    // Check if part exists
    const existing = await prisma.part.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    // Track revision if revision field changed
    const shouldTrackRevision =
      data.revision && data.revision !== existing.revision;

    const part = await prisma.part.update({
      where: { id },
      data: {
        partNumber: data.partNumber,
        name: data.name,
        description: data.description,
        category: data.category,
        unit: data.unit,

        // ROOT LEVEL FIELDS - Keep in sync with nested relations for backwards compatibility
        unitCost: data.unitCost ?? 0,
        standardCost: data.standardCost,
        averageCost: data.averageCost,
        landedCost: data.landedCost,
        freightPercent: data.freightPercent,
        dutyPercent: data.dutyPercent,
        overheadPercent: data.overheadPercent,
        priceBreakQty1: data.priceBreakQty1,
        priceBreakCost1: data.priceBreakCost1,
        priceBreakQty2: data.priceBreakQty2,
        priceBreakCost2: data.priceBreakCost2,
        priceBreakQty3: data.priceBreakQty3,
        priceBreakCost3: data.priceBreakCost3,
        weightKg: data.weightKg,
        lengthMm: data.lengthMm,
        widthMm: data.widthMm,
        heightMm: data.heightMm,
        volumeCm3: data.volumeCm3,
        color: data.color,
        material: data.material,
        leadTimeDays: data.leadTimeDays ?? 14,
        minStockLevel: data.minStockLevel ?? 0,
        reorderPoint: data.reorderPoint ?? 0,
        safetyStock: data.safetyStock ?? 0,
        makeOrBuy: data.makeOrBuy ?? "BUY",
        procurementType: data.procurementType ?? "STOCK",
        moq: data.moq ?? 1,
        orderMultiple: data.orderMultiple ?? 1,
        manufacturer: data.manufacturer,
        manufacturerPn: data.manufacturerPn,
        countryOfOrigin: data.countryOfOrigin,
        ndaaCompliant: data.ndaaCompliant ?? true,
        itarControlled: data.itarControlled ?? false,
        rohsCompliant: data.rohsCompliant ?? true,
        reachCompliant: data.reachCompliant ?? true,
        revision: data.revision ?? "A",
        revisionDate: data.revisionDate ? new Date(data.revisionDate) : undefined,
        drawingNumber: data.drawingNumber,
        drawingUrl: data.drawingUrl,
        datasheetUrl: data.datasheetUrl,
        subCategory: data.subCategory,
        partType: data.partType,
        buyerCode: data.buyerCode,
        standardPack: data.standardPack,
        hsCode: data.hsCode,
        eccn: data.eccn,
        lotControl: data.lotControl,
        serialControl: data.serialControl,
        shelfLifeDays: data.shelfLifeDays,
        inspectionRequired: data.inspectionRequired,
        inspectionPlan: data.inspectionPlan,
        aqlLevel: data.aqlLevel,
        certificateRequired: data.certificateRequired,

        status: "active",
        lifecycleStatus: data.lifecycleStatus,
        isCritical: data.isCritical,

        tags: data.tags,
        updatedBy: session.user?.email || "system",

        // Nested Updates (using deleteMany + create for one-to-many)
        costs: {
          deleteMany: {},
          create: {
            unitCost: data.unitCost || 0,
            standardCost: data.standardCost,
            averageCost: data.averageCost,
            landedCost: data.landedCost,
            freightPercent: data.freightPercent,
            dutyPercent: data.dutyPercent,
            overheadPercent: data.overheadPercent,
            priceBreakQty1: data.priceBreakQty1,
            priceBreakCost1: data.priceBreakCost1,
            priceBreakQty2: data.priceBreakQty2,
            priceBreakCost2: data.priceBreakCost2,
            priceBreakQty3: data.priceBreakQty3,
            priceBreakCost3: data.priceBreakCost3,
          }
        },

        planning: {
          upsert: {
            create: {
              minStockLevel: data.minStockLevel || 0,
              reorderPoint: data.reorderPoint || 0,
              maxStock: data.maxStock,
              safetyStock: data.safetyStock || 0,
              leadTimeDays: data.leadTimeDays || 0,
              makeOrBuy: data.makeOrBuy || "BUY",
              procurementType: data.procurementType || "STOCK",
              buyerCode: data.buyerCode,
              moq: data.moq || 1,
              orderMultiple: data.orderMultiple || 1,
              standardPack: data.standardPack || 1,
            },
            update: {
              minStockLevel: data.minStockLevel,
              reorderPoint: data.reorderPoint,
              maxStock: data.maxStock,
              safetyStock: data.safetyStock,
              leadTimeDays: data.leadTimeDays,
              makeOrBuy: data.makeOrBuy,
              procurementType: data.procurementType,
              buyerCode: data.buyerCode,
              moq: data.moq,
              orderMultiple: data.orderMultiple,
              standardPack: data.standardPack,
            }
          }
        },

        specs: {
          upsert: {
            create: {
              weightKg: data.weightKg,
              lengthMm: data.lengthMm,
              widthMm: data.widthMm,
              heightMm: data.heightMm,
              volumeCm3: data.volumeCm3,
              color: data.color,
              material: data.material,
              drawingNumber: data.drawingNumber,
              drawingUrl: data.drawingUrl,
              datasheetUrl: data.datasheetUrl,
              specDocument: data.specDocument,
              manufacturerPn: data.manufacturerPn,
              manufacturer: data.manufacturer,
              subCategory: data.subCategory,
              partType: data.partType,
            },
            update: {
              weightKg: data.weightKg,
              lengthMm: data.lengthMm,
              widthMm: data.widthMm,
              heightMm: data.heightMm,
              volumeCm3: data.volumeCm3,
              color: data.color,
              material: data.material,
              drawingNumber: data.drawingNumber,
              drawingUrl: data.drawingUrl,
              datasheetUrl: data.datasheetUrl,
              specDocument: data.specDocument,
              manufacturerPn: data.manufacturerPn,
              manufacturer: data.manufacturer,
              subCategory: data.subCategory,
              partType: data.partType,
            }
          }
        },

        compliance: {
          upsert: {
            create: {
              countryOfOrigin: data.countryOfOrigin,
              hsCode: data.hsCode,
              eccn: data.eccn,
              ndaaCompliant: data.ndaaCompliant ?? true,
              itarControlled: data.itarControlled ?? false,
              lotControl: data.lotControl ?? false,
              serialControl: data.serialControl ?? false,
              shelfLifeDays: data.shelfLifeDays,
              inspectionRequired: data.inspectionRequired ?? true,
              aqlLevel: data.aqlLevel,
              certificateRequired: data.certificateRequired ?? false,
              rohsCompliant: data.rohsCompliant ?? true,
              reachCompliant: data.reachCompliant ?? true,
            },
            update: {
              countryOfOrigin: data.countryOfOrigin,
              hsCode: data.hsCode,
              eccn: data.eccn,
              ndaaCompliant: data.ndaaCompliant,
              itarControlled: data.itarControlled,
              lotControl: data.lotControl,
              serialControl: data.serialControl,
              shelfLifeDays: data.shelfLifeDays,
              inspectionRequired: data.inspectionRequired,
              aqlLevel: data.aqlLevel,
              certificateRequired: data.certificateRequired,
              rohsCompliant: data.rohsCompliant,
              reachCompliant: data.reachCompliant,
            }
          }
        },
      },
      include: {
        costs: true,
        planning: true,
        specs: true,
        compliance: true,
        partSuppliers: {
          include: { supplier: true },
        },
      },
    });

    // Create revision history if revision changed
    if (shouldTrackRevision) {
      await prisma.partRevision.create({
        data: {
          id: `REV-${Date.now()}`,
          partId: id,
          revision: data.revision,
          previousRevision: existing.revision,
          revisionDate: new Date(),
          changeType: data.changeType || "REVISION",
          changeReason: data.changeReason,
          changeDescription: data.changeDescription,
          ecrNumber: data.ecrNumber,
          ecoNumber: data.ecoNumber,
          changedBy: session.user?.email || "system",
        },
      });
    }

    // Sync MOQ to all existing PartSupplier records when moq changes
    if (data.moq !== undefined && data.moq !== existing.moq) {
      await prisma.partSupplier.updateMany({
        where: { partId: id },
        data: { minOrderQty: data.moq },
      });
    }

    // Update primary supplier if primarySupplierId is provided
    if (data.primarySupplierId !== undefined) {
      // Remove existing preferred supplier
      await prisma.partSupplier.deleteMany({
        where: { partId: id, isPreferred: true },
      });

      // Create new preferred supplier if not null
      if (data.primarySupplierId) {
        await prisma.partSupplier.create({
          data: {
            partId: id,
            supplierId: data.primarySupplierId,
            isPreferred: true,
            unitPrice: data.unitCost ?? 0,
            leadTimeDays: data.leadTimeDays ?? 0,
            minOrderQty: data.moq ?? 1,
          },
        });
      }
    }

    // Update secondary suppliers if secondarySupplierIds is provided
    if (data.secondarySupplierIds !== undefined) {
      // Remove existing non-preferred suppliers
      await prisma.partSupplier.deleteMany({
        where: { partId: id, isPreferred: false },
      });

      // Create new secondary suppliers
      if (data.secondarySupplierIds && data.secondarySupplierIds.length > 0) {
        await prisma.partSupplier.createMany({
          data: data.secondarySupplierIds.map((supplierId: string) => ({
            partId: id,
            supplierId,
            isPreferred: false,
            unitPrice: data.unitCost ?? 0,
            leadTimeDays: data.leadTimeDays ?? 0,
            minOrderQty: data.moq ?? 1,
          })),
        });
      }
    }

    // Re-fetch with updated suppliers
    const updatedPart = await prisma.part.findUnique({
      where: { id },
      include: {
        costs: true,
        planning: true,
        specs: true,
        compliance: true,
        partSuppliers: { include: { supplier: true } },
      },
    });

    // Audit trail: log field-level changes
    auditUpdate(request, session.user, "Part", id, existing as Record<string, unknown>, data);

    return NextResponse.json(updatedPart);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PUT /api/parts/[id]' });
    return NextResponse.json(
      { error: "Failed to update part" },
      { status: 500 }
    );
  }
});

// PATCH - Alias for PUT (partial update)
export const PATCH = PUT;

// DELETE - Delete part
export const DELETE = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { authorized } = await checkPermission('orders:delete');
    if (!authorized) {
      return NextResponse.json({ error: "Forbidden - Bạn không có quyền xóa" }, { status: 403 });
    }

    const { id } = await context.params;

    // Check if part is used in any BOM
    const usedInBom = await prisma.bomLine.findFirst({
      where: { partId: id },
    });

    if (usedInBom) {
      // Soft delete - mark as obsolete instead
      await prisma.part.update({
        where: { id },
        data: {
          lifecycleStatus: "OBSOLETE",
          obsoleteDate: new Date(),
          updatedBy: session.user?.email || "system",
        },
      });

      auditDelete(request, session.user, "Part", id, { softDeleted: true, partNumber: (await prisma.part.findUnique({ where: { id }, select: { partNumber: true } }))?.partNumber });

      return NextResponse.json({
        message: "Part marked as obsolete (used in BOM)",
        softDeleted: true,
      });
    }

    // Hard delete if not used
    const deletedPart = await prisma.part.findUnique({ where: { id }, select: { partNumber: true, name: true } });
    await prisma.part.delete({ where: { id } });

    auditDelete(request, session.user, "Part", id, deletedPart);

    return NextResponse.json({ message: "Part deleted successfully" });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'DELETE /api/parts/[id]' });
    return NextResponse.json(
      { error: "Failed to delete part" },
      { status: 500 }
    );
  }
});
