// Mobile API - Inventory Adjustment
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from '@/lib/api/with-auth';
import { prisma } from "@/lib/prisma";
import { logger } from '@/lib/logger';
import { z } from "zod";

import { checkWriteEndpointLimit } from '@/lib/rate-limit';
const MobileInventoryAdjustSchema = z.object({
  partId: z.string().optional(),
  partSku: z.string().optional(),
  warehouseId: z.string().optional(),
  warehouseCode: z.string().optional(),
  quantity: z.number({ error: "Quantity is required" }),
  reason: z.string().optional(),
  lotNumber: z.string().optional(),
  offlineOperationId: z.string().optional(),
}).refine(
  (data) => data.partId || data.partSku,
  { message: "Either partId or partSku is required", path: ["partId"] }
).refine(
  (data) => data.warehouseId || data.warehouseCode,
  { message: "Either warehouseId or warehouseCode is required", path: ["warehouseId"] }
);

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const body = await request.json();

    const validation = MobileInventoryAdjustSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const {
      partId,
      partSku,
      warehouseId,
      warehouseCode,
      quantity,
      reason,
      lotNumber,
      offlineOperationId,
    } = validation.data;

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

    if (!resolvedPartId || !resolvedWarehouseId) {
      return NextResponse.json(
        { error: "Could not resolve part or warehouse" },
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
      { error: "Failed to adjust inventory" },
      { status: 500 }
    );
  }
});
