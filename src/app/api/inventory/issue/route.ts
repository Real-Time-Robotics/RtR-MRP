import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { issueMaterials, issueAdHocMaterials } from '@/lib/mrp-engine';
import {
  withPermission,
  successResponse,
  errorResponse,
  validationErrorResponse,
  AuthUser,
} from '@/lib/api/with-permission';
import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

// =============================================================================
// INVENTORY ISSUE API
// Centralized material issue: WO-linked and ad-hoc (maintenance, scrap, etc.)
// =============================================================================

const woIssueSchema = z.object({
  mode: z.literal('wo'),
  allocationIds: z.array(z.string().min(1)).min(1, 'Chọn ít nhất 1 allocation'),
});

const adhocIssueSchema = z.object({
  mode: z.literal('adhoc'),
  partId: z.string().min(1, 'Part ID là bắt buộc'),
  warehouseId: z.string().min(1, 'Warehouse ID là bắt buộc'),
  quantity: z.number().int().min(1, 'Số lượng phải lớn hơn 0'),
  lotNumber: z.string().optional(),
  issueType: z.enum(['maintenance', 'sample', 'scrap', 'internal', 'other', 'work_order']),
  reason: z.string().min(1, 'Lý do xuất kho là bắt buộc'),
  notes: z.string().optional(),
  workOrderId: z.string().optional(),
});

const issueBodySchema = z.discriminatedUnion('mode', [woIssueSchema, adhocIssueSchema]);

// =============================================================================
// GET - Pending WO allocations ready to issue
// =============================================================================

async function getHandler(
  _request: NextRequest,
  { user: _user }: { params?: Record<string, string>; user: AuthUser }
) {
  // Get allocated (not yet fully issued) WO allocations
  const allocations = await prisma.materialAllocation.findMany({
    where: {
      status: 'allocated',
      allocatedQty: { gt: 0 },
    },
    include: {
      part: { select: { id: true, partNumber: true, name: true, unit: true } },
      workOrder: {
        select: {
          id: true,
          woNumber: true,
          status: true,
          product: { select: { name: true, sku: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Filter to only those with remaining qty to issue
  const pending = allocations
    .filter((a) => a.issuedQty < a.allocatedQty)
    .map((a) => ({
      id: a.id,
      workOrderId: a.workOrder.id,
      woNumber: a.workOrder.woNumber,
      woStatus: a.workOrder.status,
      productName: a.workOrder.product.name,
      productSku: a.workOrder.product.sku,
      partId: a.part.id,
      partNumber: a.part.partNumber,
      partName: a.part.name,
      unit: a.part.unit,
      requiredQty: a.requiredQty,
      allocatedQty: a.allocatedQty,
      issuedQty: a.issuedQty,
      remainingQty: a.allocatedQty - a.issuedQty,
      status: a.status,
    }));

  // Compute stats
  const stats = {
    pendingCount: pending.length,
    partsAffected: new Set(pending.map((p) => p.partId)).size,
    totalQtyToIssue: pending.reduce((sum, p) => sum + p.remainingQty, 0),
  };

  return successResponse({ allocations: pending, stats });
}

// =============================================================================
// POST - Issue materials (WO-linked or ad-hoc)
// =============================================================================

async function postHandler(
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

  const validation = issueBodySchema.safeParse(body);
  if (!validation.success) {
    const errors: Record<string, string[]> = {};
    validation.error.issues.forEach((err) => {
      const path = err.path.join('.');
      if (!errors[path]) errors[path] = [];
      errors[path].push(err.message);
    });
    return validationErrorResponse(errors);
  }

  const data = validation.data;

  if (data.mode === 'wo') {
    // WO-linked issue: find the work order from the first allocation
    const firstAlloc = await prisma.materialAllocation.findUnique({
      where: { id: data.allocationIds[0] },
      select: { workOrderId: true },
    });

    if (!firstAlloc) {
      return errorResponse('Allocation not found', 404);
    }

    try {
      const result = await issueMaterials(firstAlloc.workOrderId, data.allocationIds);
      return successResponse(result);
    } catch (error: unknown) {
      return errorResponse('Failed to issue work order materials', 500);
    }
  }

  // Ad-hoc issue
  try {
    const result = await issueAdHocMaterials({
      partId: data.partId,
      warehouseId: data.warehouseId,
      quantity: data.quantity,
      lotNumber: data.lotNumber,
      issueType: data.issueType,
      reason: data.reason,
      userId: user.id,
      notes: data.notes,
      workOrderId: data.workOrderId,
    });
    return successResponse(result);
  } catch (error: unknown) {
    return errorResponse('Failed to issue materials', 400);
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

const handler = withPermission(getHandler, { read: 'inventory:view' });
const postWithPerm = withPermission(postHandler, { create: 'inventory:issue' });

export const GET = handler;
export const POST = postWithPerm;
