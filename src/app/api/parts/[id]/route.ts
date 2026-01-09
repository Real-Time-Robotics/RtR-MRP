import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { rolePermissions, UserRole } from "@/lib/auth/auth-types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Permission check helper
async function checkPermission(permission: string): Promise<{ authorized: boolean; session: any }> {
  const session = await auth();
  if (!session?.user) return { authorized: false, session: null };

  const userRole = (session.user as { role?: string }).role as UserRole | undefined;
  if (!userRole) return { authorized: false, session };

  const userPermissions = rolePermissions[userRole] || [];
  return { authorized: userPermissions.includes(permission as any), session };
}

// GET - Get single part with full details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const part = await prisma.part.findUnique({
      where: { id },
      include: {
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

    return NextResponse.json(part);
  } catch (error) {
    console.error("Failed to fetch part:", error);
    return NextResponse.json(
      { error: "Failed to fetch part" },
      { status: 500 }
    );
  }
}

// PUT - Update part
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { authorized, session } = await checkPermission('orders:edit');
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!authorized) {
      return NextResponse.json({ error: "Forbidden - Bạn không có quyền chỉnh sửa" }, { status: 403 });
    }

    const { id } = await params;
    const data = await request.json();

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

        // Remove legacy fields from Part root
        // unitCost, weightKg, leadTimeDays, etc.

        status: "active",
        lifecycleStatus: data.lifecycleStatus,
        isCritical: data.isCritical,

        // Handle revision history - revision logic might need adjustment if field is gone.
        // Assuming we keep tracking it but not on Part table? 
        // Or if 'partRevisions' is the only place?
        // Let's assume for now we don't write 'revision' to Part based on error 'revision does not exist'.

        tags: data.tags,
        updatedBy: session.user?.email || "system",

        // Nested Updates (using upsert to be safe)
        cost: {
          upsert: {
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
            },
            update: {
              unitCost: data.unitCost,
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
        cost: true,
        planning: true,
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

    return NextResponse.json(part);
  } catch (error) {
    console.error("Failed to update part:", error);
    return NextResponse.json(
      { error: "Failed to update part" },
      { status: 500 }
    );
  }
}

// DELETE - Delete part
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { authorized, session } = await checkPermission('orders:delete');
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!authorized) {
      return NextResponse.json({ error: "Forbidden - Bạn không có quyền xóa" }, { status: 403 });
    }

    const { id } = await params;

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

      return NextResponse.json({
        message: "Part marked as obsolete (used in BOM)",
        softDeleted: true,
      });
    }

    // Hard delete if not used
    await prisma.part.delete({ where: { id } });

    return NextResponse.json({ message: "Part deleted successfully" });
  } catch (error) {
    console.error("Failed to delete part:", error);
    return NextResponse.json(
      { error: "Failed to delete part" },
      { status: 500 }
    );
  }
}
