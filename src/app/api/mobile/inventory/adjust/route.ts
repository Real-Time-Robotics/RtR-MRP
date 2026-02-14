// Mobile API - Inventory Adjustment
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      partId,
      partSku,
      warehouseId,
      warehouseCode,
      quantity,
      reason,
      lotNumber,
      offlineOperationId,
    } = body;

    // Resolve part
    let resolvedPartId = partId;
    if (!resolvedPartId && partSku) {
      const part = await prisma.part.findFirst({ where: { partNumber: partSku } });
      if (!part) {
        return NextResponse.json({ error: "Part not found" }, { status: 404 });
      }
      resolvedPartId = part.id;
    }

    // Resolve warehouse
    let resolvedWarehouseId = warehouseId;
    if (!resolvedWarehouseId && warehouseCode) {
      const warehouse = await prisma.warehouse.findFirst({
        where: { code: warehouseCode },
      });
      if (!warehouse) {
        return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
      }
      resolvedWarehouseId = warehouse.id;
    }

    if (!resolvedPartId || !resolvedWarehouseId || quantity === undefined) {
      return NextResponse.json(
        { error: "partId/partSku, warehouseId/warehouseCode, and quantity are required" },
        { status: 400 }
      );
    }

    // Perform inventory adjustment using transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get or create inventory record
      let inventory = await tx.inventory.findFirst({
        where: {
          partId: resolvedPartId,
          warehouseId: resolvedWarehouseId,
          lotNumber: lotNumber || null,
        },
      });

      if (!inventory) {
        // Create new inventory record
        inventory = await tx.inventory.create({
          data: {
            partId: resolvedPartId,
            warehouseId: resolvedWarehouseId,
            quantity: 0,
            reservedQty: 0,
            lotNumber: lotNumber || null,
          },
        });
      }

      const newQuantity = inventory.quantity + quantity;

      if (newQuantity < 0) {
        throw new Error("Insufficient inventory for adjustment");
      }

      // Update inventory
      const updatedInventory = await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          quantity: newQuantity,
        },
      });

      return { inventory: updatedInventory };
    });

    // Log to mobile scan log if offline operation
    if (offlineOperationId) {
      await prisma.scanLog.create({
        data: {
          barcodeValue: partSku || resolvedPartId,
          barcodeType: "PART",
          resolvedType: "PART",
          resolvedId: resolvedPartId,
          scanContext: "INVENTORY",
          actionTaken: `ADJUST: ${quantity > 0 ? "+" : ""}${quantity} (${reason || "No reason"})`,
          scannedBy: session.user.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      inventory: result.inventory,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/mobile/inventory/adjust' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to adjust inventory" },
      { status: 500 }
    );
  }
}
