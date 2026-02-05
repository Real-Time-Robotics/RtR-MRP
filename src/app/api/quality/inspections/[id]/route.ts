import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get single inspection
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const inspection = await prisma.inspection.findUnique({
      where: { id },
      include: {
        part: { select: { id: true, partNumber: true, name: true, unit: true } },
        product: { select: { id: true, sku: true, name: true } },
        plan: { select: { id: true, planNumber: true, name: true } },
        results: {
          include: { characteristic: true },
          orderBy: { inspectedAt: "asc" },
        },
      },
    });

    if (!inspection) {
      return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
    }

    return NextResponse.json(inspection);
  } catch (error) {
    console.error("Failed to fetch inspection:", error);
    return NextResponse.json({ error: "Failed to fetch inspection" }, { status: 500 });
  }
}

// PUT - Update inspection (status, result, etc.)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    const existing = await prisma.inspection.findUnique({
      where: { id },
      include: { part: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (data.status) updateData.status = data.status;
    if (data.result) updateData.result = data.result;
    if (data.quantityInspected !== undefined) updateData.quantityInspected = data.quantityInspected;
    if (data.quantityAccepted !== undefined) updateData.quantityAccepted = data.quantityAccepted;
    if (data.quantityRejected !== undefined) updateData.quantityRejected = data.quantityRejected;
    if (data.notes !== undefined) updateData.notes = data.notes;

    if (data.status === "completed") {
      updateData.inspectedAt = new Date();
    }

    const inspection = await prisma.inspection.update({
      where: { id },
      data: updateData,
      include: {
        part: { select: { id: true, partNumber: true, name: true, unit: true } },
        results: { include: { characteristic: true } },
      },
    });

    // When RECEIVING inspection is completed, handle inventory based on result
    if (
      data.status === "completed" &&
      existing.type === "RECEIVING" &&
      existing.partId &&
      data.result
    ) {
      const lotNumber = existing.lotNumber || `INS-${existing.inspectionNumber}`;

      // Determine target warehouse based on result
      let targetWarehouse = null;
      let quantity = 0;
      let locationCode = '';

      if (data.result === "PASS") {
        // PASS → Main Warehouse (default)
        targetWarehouse = await prisma.warehouse.findFirst({
          where: { type: "MAIN", isDefault: true },
        });
        if (!targetWarehouse) {
          targetWarehouse = await prisma.warehouse.findFirst({
            where: { isDefault: true },
          });
        }
        quantity = data.quantityAccepted || existing.quantityAccepted || 0;
        locationCode = 'STOCK';
      } else if (data.result === "FAIL") {
        // FAIL → Quarantine warehouse
        targetWarehouse = await prisma.warehouse.findFirst({
          where: { type: "QUARANTINE" },
        });
        quantity = data.quantityRejected || existing.quantityRejected || existing.quantityReceived || 0;
        locationCode = 'QUARANTINE';
      } else if (data.result === "CONDITIONAL") {
        // CONDITIONAL → Hold Area warehouse
        targetWarehouse = await prisma.warehouse.findFirst({
          where: { type: "HOLD" },
        });
        quantity = data.quantityAccepted || existing.quantityAccepted || existing.quantityReceived || 0;
        locationCode = 'HOLD';
      }

      // Create/Update inventory if warehouse found and quantity > 0
      if (targetWarehouse && quantity > 0) {
        // Check if inventory already exists for this part + warehouse + lot
        const existingInventory = await prisma.inventory.findFirst({
          where: {
            partId: existing.partId,
            warehouseId: targetWarehouse.id,
            lotNumber: lotNumber,
          },
        });

        if (existingInventory) {
          // Update existing inventory
          await prisma.inventory.update({
            where: { id: existingInventory.id },
            data: {
              quantity: existingInventory.quantity + quantity,
            },
          });
        } else {
          // Create new inventory record
          await prisma.inventory.create({
            data: {
              partId: existing.partId,
              warehouseId: targetWarehouse.id,
              quantity: quantity,
              reservedQty: 0,
              lotNumber: lotNumber,
              locationCode: locationCode,
            },
          });
        }
      }

      // For FAIL result, also create NCR if not exists
      if (data.result === "FAIL" && quantity > 0) {
        const existingNCR = await prisma.nCR.findFirst({
          where: { inspectionId: existing.id },
        });

        if (!existingNCR) {
          const ncrCount = await prisma.nCR.count();
          const ncrNumber = `NCR-${new Date().getFullYear()}-${String(ncrCount + 1).padStart(4, '0')}`;

          await prisma.nCR.create({
            data: {
              ncrNumber,
              status: 'open',
              priority: 'medium',
              source: 'receiving', // lowercase to match API schema
              inspectionId: existing.id,
              partId: existing.partId,
              lotNumber: lotNumber,
              quantityAffected: quantity,
              title: `Receiving inspection failed - ${existing.inspectionNumber}`,
              description: `Receiving inspection ${existing.inspectionNumber} failed with ${quantity} rejected items. Lot: ${lotNumber}`,
              createdBy: session.user?.id || 'system',
            },
          });
        }
      }
    }

    return NextResponse.json(inspection);
  } catch (error) {
    console.error("Failed to update inspection:", error);
    return NextResponse.json({ error: "Failed to update inspection" }, { status: 500 });
  }
}
