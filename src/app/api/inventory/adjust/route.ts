import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import {
  withPermission,
  successResponse,
  errorResponse,
  validationErrorResponse,
  AuthUser,
} from '@/lib/api/with-permission';
import { checkWriteEndpointLimit } from '@/lib/rate-limit';

// =============================================================================
// INVENTORY ADJUSTMENT API
// Allows adjusting inventory quantities with audit trail
// =============================================================================

const adjustmentSchema = z.object({
  partId: z.string().min(1, 'Part ID là bắt buộc'),
  warehouseId: z.string().min(1, 'Warehouse ID là bắt buộc'),
  adjustmentType: z.enum(['add', 'subtract', 'set', 'cycle_count']),
  quantity: z.number().int(),
  reason: z.string().min(1, 'Lý do điều chỉnh là bắt buộc'),
  reference: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => {
    // For set and cycle_count, quantity must be >= 0 (cannot set inventory to negative)
    if (['set', 'cycle_count'].includes(data.adjustmentType)) {
      return data.quantity >= 0;
    }
    // For add and subtract, quantity must be > 0
    return data.quantity > 0;
  },
  {
    message: 'Số lượng phải >= 0 cho set/cycle_count, hoặc > 0 cho add/subtract',
    path: ['quantity'],
  }
);

const transferSchema = z.object({
  partId: z.string().min(1),
  fromWarehouseId: z.string().min(1),
  toWarehouseId: z.string().min(1),
  quantity: z.number().int().min(1),
  reason: z.string().optional(),
});

// =============================================================================
// POST - Adjust inventory
// =============================================================================

async function adjustHandler(
  request: NextRequest,
  { user }: { params?: Record<string, string>; user: AuthUser }
) {
  // Rate limiting
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  // Check if it's a transfer request
  if (body.fromWarehouseId && body.toWarehouseId) {
    return handleTransfer(body, user);
  }

  const validation = adjustmentSchema.safeParse(body);
  if (!validation.success) {
    const errors: Record<string, string[]> = {};
    validation.error.issues.forEach((err) => {
      const path = err.path.join('.');
      if (!errors[path]) errors[path] = [];
      errors[path].push(err.message);
    });
    return validationErrorResponse(errors);
  }

  const { partId, warehouseId, adjustmentType, quantity, reason, reference, notes } = validation.data;

  // Find or create inventory record
  let inventory = await prisma.inventory.findFirst({
    where: { partId, warehouseId },
  });

  if (!inventory) {
    // Create new inventory record
    inventory = await prisma.inventory.create({
      data: {
        partId,
        warehouseId,
        quantity: 0,
        reservedQty: 0,
        locationCode: 'DEFAULT',
      },
    });
  }

  // Calculate new quantity
  let newQuantity = inventory.quantity;
  let adjustmentAmount = quantity;

  switch (adjustmentType) {
    case 'add':
      newQuantity = inventory.quantity + quantity;
      break;
    case 'subtract':
      newQuantity = inventory.quantity - quantity;
      adjustmentAmount = -quantity;
      if (newQuantity < 0) {
        return errorResponse(`Không đủ tồn kho. Hiện có: ${inventory.quantity}`, 400);
      }
      break;
    case 'set':
      adjustmentAmount = quantity - inventory.quantity;
      newQuantity = quantity;
      break;
    case 'cycle_count':
      adjustmentAmount = quantity - inventory.quantity;
      newQuantity = quantity;
      break;
  }

  // Update inventory + create audit log atomically
  const updatedInventory = await prisma.$transaction(async (tx) => {
    const updated = await tx.inventory.update({
      where: { id: inventory.id },
      data: {
        quantity: newQuantity,
        updatedAt: new Date(),
      },
      include: {
        part: { select: { id: true, partNumber: true, name: true } },
        warehouse: { select: { id: true, code: true, name: true } },
      },
    });

    // Create audit log (LotTransaction requires lotNumber and userId)
    if (user.id) {
      await tx.lotTransaction.create({
        data: {
          lotNumber: `ADJ-${Date.now()}`,
          partId,
          transactionType: adjustmentType.toUpperCase(),
          quantity: adjustmentAmount,
          previousQty: inventory.quantity,
          newQty: newQuantity,
          userId: user.id,
          notes: `${reason}${notes ? ` - ${notes}` : ''}`,
        },
      });
    }

    return updated;
  });

  return successResponse({
    inventory: updatedInventory,
    adjustment: {
      type: adjustmentType,
      previousQuantity: inventory.quantity,
      adjustmentAmount,
      newQuantity,
      reason,
      adjustedBy: user.email,
      adjustedAt: new Date().toISOString(),
    },
  });
}

// =============================================================================
// Handle Transfer between warehouses
// =============================================================================

async function handleTransfer(body: unknown, user: AuthUser) {
  const validation = transferSchema.safeParse(body);
  if (!validation.success) {
    const errors: Record<string, string[]> = {};
    validation.error.issues.forEach((err) => {
      const path = err.path.join('.');
      if (!errors[path]) errors[path] = [];
      errors[path].push(err.message);
    });
    return validationErrorResponse(errors);
  }

  const { partId, fromWarehouseId, toWarehouseId, quantity, reason } = validation.data;

  if (fromWarehouseId === toWarehouseId) {
    return errorResponse('Kho nguồn và kho đích phải khác nhau', 400);
  }

  // Check source inventory
  const sourceInventory = await prisma.inventory.findFirst({
    where: { partId, warehouseId: fromWarehouseId },
  });

  if (!sourceInventory || sourceInventory.quantity < quantity) {
    return errorResponse(
      `Không đủ tồn kho. Hiện có: ${sourceInventory?.quantity || 0}`,
      400
    );
  }

  // Find or create destination inventory
  let destInventory = await prisma.inventory.findFirst({
    where: { partId, warehouseId: toWarehouseId },
  });

  // Perform transfer in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Subtract from source
    const updatedSource = await tx.inventory.update({
      where: { id: sourceInventory.id },
      data: { quantity: sourceInventory.quantity - quantity },
    });

    // Add to destination
    let updatedDest;
    if (destInventory) {
      updatedDest = await tx.inventory.update({
        where: { id: destInventory.id },
        data: { quantity: destInventory.quantity + quantity },
      });
    } else {
      updatedDest = await tx.inventory.create({
        data: {
          partId,
          warehouseId: toWarehouseId,
          quantity,
          reservedQty: 0,
          locationCode: 'DEFAULT',
        },
      });
    }

    return { source: updatedSource, destination: updatedDest };
  });

  return successResponse({
    transfer: {
      partId,
      fromWarehouseId,
      toWarehouseId,
      quantity,
      reason,
      transferredBy: user.email,
      transferredAt: new Date().toISOString(),
    },
    sourceInventory: result.source,
    destinationInventory: result.destination,
  });
}

export const POST = withPermission(adjustHandler, { create: 'inventory:adjust' });
