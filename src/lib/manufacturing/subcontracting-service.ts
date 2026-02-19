// src/lib/manufacturing/subcontracting-service.ts
// R11: Subcontracting Module — send materials to subcontractors, receive processed goods

import { prisma } from "@/lib/prisma";

interface SubcontractSendInput {
  supplierId: string;
  items: Array<{
    partId: string;
    warehouseId: string;
    quantity: number;
    lotNumber?: string;
  }>;
  purchaseOrderId?: string;
  workOrderId?: string;
  expectedReturnDate?: Date;
  userId: string;
  notes?: string;
}

interface SubcontractSendResult {
  success: boolean;
  shipmentRef: string;
  itemsSent: number;
  totalQuantity: number;
  errors: string[];
}

interface SubcontractReceiveInput {
  shipmentRef: string;
  supplierId: string;
  items: Array<{
    partId: string;
    receivedQty: number;
    lotNumber?: string;
    inspectionRequired?: boolean;
  }>;
  warehouseId: string;
  userId: string;
  notes?: string;
}

interface SubcontractReceiveResult {
  success: boolean;
  itemsReceived: number;
  totalReceived: number;
  toInspection: number;
  errors: string[];
}

/**
 * Send materials to a subcontractor for external processing.
 * Deducts from inventory and creates tracking transactions.
 */
export async function sendToSubcontractor(
  input: SubcontractSendInput
): Promise<SubcontractSendResult> {
  const { supplierId, items, purchaseOrderId, workOrderId, expectedReturnDate, userId, notes } = input;
  const errors: string[] = [];

  // Validate supplier exists
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { id: true, code: true, name: true },
  });

  if (!supplier) {
    return { success: false, shipmentRef: "", itemsSent: 0, totalQuantity: 0, errors: ["Supplier not found"] };
  }

  const shipmentRef = `SC-OUT-${supplier.code}-${Date.now().toString(36).toUpperCase()}`;
  let totalQuantity = 0;
  let itemsSent = 0;

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      // Find inventory record
      const whereClause: Record<string, unknown> = {
        partId: item.partId,
        warehouseId: item.warehouseId,
      };
      if (item.lotNumber) {
        whereClause.lotNumber = item.lotNumber;
      }

      const inventory = await tx.inventory.findFirst({
        where: whereClause,
        include: { part: true },
      });

      if (!inventory) {
        errors.push(`Inventory not found for part ${item.partId}`);
        continue;
      }

      const available = inventory.quantity - inventory.reservedQty;
      if (available < item.quantity) {
        errors.push(
          `Insufficient inventory for ${inventory.part.partNumber}: available ${available}, requested ${item.quantity}`
        );
        continue;
      }

      // Deduct inventory
      await tx.inventory.update({
        where: { id: inventory.id },
        data: { quantity: { decrement: item.quantity } },
      });

      // Create lot transaction for send-out
      await tx.lotTransaction.create({
        data: {
          lotNumber: item.lotNumber || `SC-${inventory.part.partNumber}-${Date.now()}`,
          transactionType: "SHIPPED",
          partId: item.partId,
          quantity: item.quantity,
          previousQty: inventory.quantity,
          newQty: inventory.quantity - item.quantity,
          fromWarehouseId: item.warehouseId,
          workOrderId: workOrderId || undefined,
          userId,
          notes: [
            `[SUBCONTRACT SEND-OUT] To: ${supplier.name} (${supplier.code})`,
            `Shipment: ${shipmentRef}`,
            purchaseOrderId ? `PO: ${purchaseOrderId}` : null,
            expectedReturnDate
              ? `Expected return: ${expectedReturnDate.toISOString().split("T")[0]}`
              : null,
            notes || null,
          ]
            .filter(Boolean)
            .join(" | "),
        },
      });

      totalQuantity += item.quantity;
      itemsSent++;
    }
  });

  return {
    success: itemsSent > 0,
    shipmentRef,
    itemsSent,
    totalQuantity,
    errors,
  };
}

/**
 * Receive processed goods back from a subcontractor.
 * Adds to inventory (or HOLD warehouse if inspection required).
 */
export async function receiveFromSubcontractor(
  input: SubcontractReceiveInput
): Promise<SubcontractReceiveResult> {
  const { shipmentRef, supplierId, items, warehouseId, userId, notes } = input;
  const errors: string[] = [];

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { id: true, code: true, name: true },
  });

  if (!supplier) {
    return { success: false, itemsReceived: 0, totalReceived: 0, toInspection: 0, errors: ["Supplier not found"] };
  }

  // Find HOLD warehouse for items needing inspection
  const holdWarehouse = await prisma.warehouse.findFirst({
    where: { type: "HOLD", status: "active" },
  });

  let totalReceived = 0;
  let itemsReceived = 0;
  let toInspection = 0;

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      if (item.receivedQty <= 0) continue;

      const part = await tx.part.findUnique({
        where: { id: item.partId },
        select: { id: true, partNumber: true, name: true, inspectionRequired: true },
      });

      if (!part) {
        errors.push(`Part not found: ${item.partId}`);
        continue;
      }

      const needsInspection = item.inspectionRequired ?? part.inspectionRequired;
      const targetWarehouseId = needsInspection && holdWarehouse
        ? holdWarehouse.id
        : warehouseId;

      const lotNum = item.lotNumber || `SC-RCV-${part.partNumber}-${Date.now()}`;

      // Upsert inventory in target warehouse
      await tx.inventory.upsert({
        where: {
          partId_warehouseId_lotNumber: {
            partId: item.partId,
            warehouseId: targetWarehouseId,
            lotNumber: lotNum,
          },
        },
        create: {
          partId: item.partId,
          warehouseId: targetWarehouseId,
          quantity: item.receivedQty,
          lotNumber: lotNum,
        },
        update: {
          quantity: { increment: item.receivedQty },
        },
      });

      // Create lot transaction for receive-back
      await tx.lotTransaction.create({
        data: {
          lotNumber: lotNum,
          transactionType: "RECEIVED",
          partId: item.partId,
          quantity: item.receivedQty,
          previousQty: 0,
          newQty: item.receivedQty,
          toWarehouseId: targetWarehouseId,
          userId,
          notes: [
            `[SUBCONTRACT RECEIVE] From: ${supplier.name} (${supplier.code})`,
            `Shipment: ${shipmentRef}`,
            needsInspection ? "→ HOLD for inspection" : "→ Direct to warehouse",
            notes || null,
          ]
            .filter(Boolean)
            .join(" | "),
        },
      });

      totalReceived += item.receivedQty;
      itemsReceived++;
      if (needsInspection) toInspection++;
    }
  });

  return {
    success: itemsReceived > 0,
    itemsReceived,
    totalReceived,
    toInspection,
    errors,
  };
}

/**
 * Get all pending subcontract shipments (sent out but not yet received back).
 */
export async function getPendingSubcontractShipments(): Promise<
  Array<{
    shipmentRef: string;
    supplierName: string;
    partNumber: string;
    quantity: number;
    sentDate: Date;
    expectedReturn: string | null;
  }>
> {
  // Find all SHIPPED transactions that are subcontract send-outs
  const sentTxs = await prisma.lotTransaction.findMany({
    where: {
      transactionType: "SHIPPED",
      notes: { contains: "[SUBCONTRACT SEND-OUT]" },
    },
    include: {
      part: { select: { partNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by shipment ref and check if received back
  const shipmentMap = new Map<
    string,
    {
      shipmentRef: string;
      supplierName: string;
      partNumber: string;
      quantity: number;
      sentDate: Date;
      expectedReturn: string | null;
    }
  >();

  for (const tx of sentTxs) {
    // Extract shipment ref from notes
    const shipmentMatch = tx.notes?.match(/Shipment: (SC-OUT-[^\s|]+)/);
    if (!shipmentMatch) continue;
    const shipmentRef = shipmentMatch[1];

    // Check if a corresponding RECEIVED exists
    const received = await prisma.lotTransaction.findFirst({
      where: {
        transactionType: "RECEIVED",
        notes: { contains: shipmentRef },
      },
    });

    if (received) continue; // Already received

    // Extract supplier name
    const supplierMatch = tx.notes?.match(/To: ([^(]+)\(/);
    const supplierName = supplierMatch ? supplierMatch[1].trim() : "Unknown";

    // Extract expected return date
    const returnMatch = tx.notes?.match(/Expected return: (\S+)/);
    const expectedReturn = returnMatch ? returnMatch[1] : null;

    shipmentMap.set(`${shipmentRef}-${tx.partId}`, {
      shipmentRef,
      supplierName,
      partNumber: tx.part?.partNumber || "Unknown",
      quantity: tx.quantity,
      sentDate: tx.createdAt,
      expectedReturn,
    });
  }

  return Array.from(shipmentMap.values());
}

/**
 * Get subcontracting summary: outstanding shipments, overdue returns, etc.
 */
export async function getSubcontractingSummary(): Promise<{
  totalPendingShipments: number;
  totalPendingQty: number;
  overdueReturns: number;
}> {
  const pending = await getPendingSubcontractShipments();

  const now = new Date();
  let overdueReturns = 0;

  for (const shipment of pending) {
    if (shipment.expectedReturn) {
      const expectedDate = new Date(shipment.expectedReturn);
      if (expectedDate < now) {
        overdueReturns++;
      }
    }
  }

  return {
    totalPendingShipments: pending.length,
    totalPendingQty: pending.reduce((sum, s) => sum + s.quantity, 0),
    overdueReturns,
  };
}
