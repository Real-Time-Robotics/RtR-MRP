// =============================================================================
// PO CANCEL
// POST /api/purchase-orders/[id]/cancel
// Changes status → cancelled
// Allowed from: draft, pending_approval, approved
// =============================================================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  withPermission,
  successResponse,
  errorResponse,
  notFoundResponse,
  AuthUser,
} from '@/lib/api/with-permission';
import { auditStatusChange } from '@/lib/audit/route-audit';
import { checkWriteEndpointLimit } from '@/lib/rate-limit';

const CANCELLABLE_STATUSES = ['draft', 'pending_approval', 'approved'];

async function postHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const po = await prisma.purchaseOrder.findUnique({ where: { id } });

  if (!po) return notFoundResponse('Đơn mua hàng');

  if (!CANCELLABLE_STATUSES.includes(po.status)) {
    return errorResponse(
      `Không thể hủy PO ở trạng thái "${po.status}". Chỉ có thể hủy PO ở trạng thái: ${CANCELLABLE_STATUSES.join(', ')}.`,
      400
    );
  }

  const previousStatus = po.status;

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      status: 'cancelled',
      notes: body.reason
        ? `${po.notes ? po.notes + '\n' : ''}[Lý do hủy] ${body.reason}`
        : po.notes,
    },
    include: {
      supplier: true,
      lines: { include: { part: true }, orderBy: { lineNumber: 'asc' } },
    },
  });

  auditStatusChange(
    request,
    { id: user.id, name: user.name, email: user.email },
    'PurchaseOrder',
    id,
    previousStatus,
    'cancelled'
  );

  return successResponse(updated);
}

export const POST = withPermission(postHandler, { create: 'orders:edit' });
