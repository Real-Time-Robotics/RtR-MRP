import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import {
  withPermission,
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
  AuthUser,
} from '@/lib/api/with-permission';
import { generateInspectionNumber } from '@/lib/quality/inspection-engine';
import { auditUpdate, auditStatusChange, auditDelete } from '@/lib/audit/route-audit';
import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

// =============================================================================
// VALIDATION
// =============================================================================

// Schema for PO line item
const POLineSchema = z.object({
  partId: z.string().min(1, "Part ID là bắt buộc"),
  quantity: z.number().int().min(1, "Số lượng phải >= 1"),
  unitPrice: z.number().min(0, "Đơn giá phải >= 0"),
});

const updatePOSchema = z.object({
  poNumber: z.string().min(1).optional(),
  supplierId: z.string().optional(),
  orderDate: z.string().or(z.date()).optional(),
  expectedDate: z.string().or(z.date()).optional(),
  status: z.enum(['draft', 'pending', 'confirmed', 'in_progress', 'received', 'cancelled']).optional(),
  currency: z.string().optional(), // Added: allow currency update
  notes: z.string().optional().nullable(),
  lines: z.array(POLineSchema).optional(),
});

// =============================================================================
// GET - Get single PO
// =============================================================================

async function getHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  // Rate limiting
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);

  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      lines: {
        include: { part: true },
        orderBy: { lineNumber: 'asc' },
      },
    },
  });

  if (!order) return notFoundResponse('Đơn mua hàng');
  return successResponse(order);
}

// =============================================================================
// PUT - Update PO
// =============================================================================

async function putHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  // Rate limiting
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);

  const existing = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!existing) return notFoundResponse('Đơn mua hàng');

  // Allow status change to "received" from "confirmed"/"in_progress"
  // But block general edits on already received/cancelled POs
  if (!['draft', 'pending', 'confirmed', 'in_progress'].includes(existing.status)) {
    return errorResponse('Không thể chỉnh sửa PO ở trạng thái này', 400);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const validation = updatePOSchema.safeParse(body);
  if (!validation.success) {
    const errors: Record<string, string[]> = {};
    validation.error.issues.forEach((err) => {
      const path = err.path.join('.');
      if (!errors[path]) errors[path] = [];
      errors[path].push(err.message);
    });
    return validationErrorResponse(errors);
  }

  const { lines, ...headerData } = validation.data;

  // Build header update data
  const updateData: Prisma.PurchaseOrderUpdateInput = { ...headerData };
  if (headerData.orderDate) updateData.orderDate = new Date(headerData.orderDate);
  if (headerData.expectedDate) updateData.expectedDate = new Date(headerData.expectedDate);

  // Validate parts exist if lines provided
  if (lines && lines.length > 0) {
    const partIds = lines.map((line) => line.partId);
    const parts = await prisma.part.findMany({
      where: { id: { in: partIds } },
      select: { id: true },
    });
    const foundPartIds = new Set(parts.map((p) => p.id));
    const missingParts = partIds.filter((pid) => !foundPartIds.has(pid));
    if (missingParts.length > 0) {
      return errorResponse(`Parts không tồn tại: ${missingParts.join(", ")}`, 400);
    }

    // Calculate new total amount
    const totalAmount = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    updateData.totalAmount = totalAmount;
  }

  // Use transaction to update header and lines together
  const order = await prisma.$transaction(async (tx) => {
    // Delete existing lines if new lines provided
    if (lines && lines.length > 0) {
      await tx.purchaseOrderLine.deleteMany({
        where: { poId: id },
      });
    }

    // Update header and create new lines
    return tx.purchaseOrder.update({
      where: { id },
      data: {
        ...updateData,
        ...(lines && lines.length > 0 && {
          lines: {
            create: lines.map((line, index) => ({
              lineNumber: index + 1,
              partId: line.partId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: line.quantity * line.unitPrice,
            })),
          },
        }),
      },
      include: {
        supplier: true,
        lines: {
          include: { part: true },
          orderBy: { lineNumber: 'asc' },
        }
      },
    });
  });

  // Audit trail: log changes
  if (validation.data.status && validation.data.status !== existing.status) {
    auditStatusChange(request, { id: user.id, name: user.name, email: user.email }, "PurchaseOrder", id!, existing.status, validation.data.status);
  } else {
    auditUpdate(request, { id: user.id, name: user.name, email: user.email }, "PurchaseOrder", id!, existing as unknown as Record<string, unknown>, headerData as Record<string, unknown>);
  }

  // === INVENTORY UPDATE: When PO status changes to "received" ===
  const isBeingReceived =
    validation.data.status === 'received' && existing.status !== 'received';

  if (isBeingReceived) {
    // Get PO lines (use updated order lines if available, else existing)
    const poLines = order.lines || existing.lines;

    if (poLines.length > 0) {
      // Find RECEIVING warehouse (dedicated for incoming goods)
      let receivingWarehouse = await prisma.warehouse.findFirst({
        where: { type: 'RECEIVING' },
      });
      // Fallback to default warehouse if no RECEIVING warehouse
      if (!receivingWarehouse) {
        receivingWarehouse = await prisma.warehouse.findFirst({
          where: { status: 'active' },
          orderBy: { createdAt: 'asc' },
        });
      }
      if (!receivingWarehouse) {
        receivingWarehouse = await prisma.warehouse.create({
          data: {
            code: 'WH-RECEIVING',
            name: 'Receiving Area',
            type: 'RECEIVING',
            status: 'active',
          },
        });
      }

      // Generate inspection numbers before transaction (may have side effects)
      const inspectionNumbers: Record<string, string> = {};
      for (const line of poLines) {
        const existingInspection = await prisma.inspection.findFirst({
          where: { poLineId: line.id, type: 'RECEIVING' },
        });
        if (!existingInspection) {
          inspectionNumbers[line.id] = await generateInspectionNumber('RECEIVING');
        }
      }

      // Atomically update inventory + create audit logs + create inspections
      await prisma.$transaction(async (tx) => {
        // Update inventory for each PO line
        for (const line of poLines) {
          const existingInventory = await tx.inventory.findFirst({
            where: { partId: line.partId, warehouseId: receivingWarehouse!.id, locationCode: 'RECEIVING' },
          });

          if (existingInventory) {
            await tx.inventory.update({
              where: { id: existingInventory.id },
              data: {
                quantity: existingInventory.quantity + line.quantity,
                updatedAt: new Date(),
              },
            });
          } else {
            await tx.inventory.create({
              data: {
                partId: line.partId,
                warehouseId: receivingWarehouse!.id,
                quantity: line.quantity,
                reservedQty: 0,
                locationCode: 'RECEIVING',
              },
            });
          }

          // Create audit log
          await tx.lotTransaction.create({
            data: {
              lotNumber: `PO-RCV-${existing.poNumber}-${line.lineNumber || Date.now()}`,
              partId: line.partId,
              transactionType: 'PO_RECEIVED',
              quantity: line.quantity,
              previousQty: existingInventory?.quantity ?? 0,
              newQty: (existingInventory?.quantity ?? 0) + line.quantity,
              userId: user.id || 'system',
              notes: `Nhận hàng từ PO: ${existing.poNumber}`,
            },
          });
        }

        // Auto-create receiving inspections for each PO line
        for (const line of poLines) {
          if (inspectionNumbers[line.id]) {
            await tx.inspection.create({
              data: {
                inspectionNumber: inspectionNumbers[line.id],
                type: 'RECEIVING',
                status: 'pending',
                partId: line.partId,
                poLineId: line.id,
                quantityReceived: line.quantity,
                quantityInspected: 0,
                inspectedBy: user.id || 'system',
                lotNumber: `LOT-${existing.poNumber}-${line.lineNumber || 1}`,
              },
            });
          }
        }
      });
    }
  }

  return successResponse(order);
}

// =============================================================================
// DELETE - Cancel/Delete PO
// =============================================================================

async function deleteHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  // Rate limiting
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);

  const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!existing) return notFoundResponse('Đơn mua hàng');

  if (existing.status === 'draft') {
    await prisma.purchaseOrder.delete({ where: { id } });
    auditDelete(request, { id: user.id, name: user.name, email: user.email }, "PurchaseOrder", id!, { poNumber: existing.poNumber });
    return successResponse({ deleted: true, id });
  }

  if (['received', 'cancelled'].includes(existing.status)) {
    return errorResponse('Không thể hủy PO đã nhận hàng hoặc đã hủy', 400);
  }

  await prisma.purchaseOrder.update({
    where: { id },
    data: { status: 'cancelled' },
  });

  auditStatusChange(request, { id: user.id, name: user.name, email: user.email }, "PurchaseOrder", id!, existing.status, "cancelled");

  return successResponse({ cancelled: true, id });
}

// =============================================================================
// EXPORTS
// =============================================================================

export const GET = withPermission(getHandler, { read: 'purchasing:view' });
export const PUT = withPermission(putHandler, { update: 'orders:edit' });
export const DELETE = withPermission(deleteHandler, { delete: 'orders:delete' });
