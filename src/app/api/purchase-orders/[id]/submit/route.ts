// =============================================================================
// PO SUBMIT FOR APPROVAL
// POST /api/purchase-orders/[id]/submit
// Changes status: draft → pending_approval
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

async function postHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { lines: true },
  });

  if (!po) return notFoundResponse('Đơn mua hàng');

  // Only DRAFT POs can be submitted
  if (po.status !== 'draft') {
    return errorResponse(
      `Không thể gửi duyệt PO ở trạng thái "${po.status}". Chỉ PO nháp mới có thể gửi duyệt.`,
      400
    );
  }

  // Must have at least one line item
  if (!po.lines || po.lines.length === 0) {
    return errorResponse('PO phải có ít nhất một dòng hàng trước khi gửi duyệt.', 400);
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      status: 'pending_approval',
      submittedAt: new Date(),
    },
    include: {
      supplier: true,
      lines: { include: { part: true }, orderBy: { lineNumber: 'asc' } },
    },
  });

  // Audit trail
  auditStatusChange(
    request,
    { id: user.id, name: user.name, email: user.email },
    'PurchaseOrder',
    id,
    'draft',
    'pending_approval'
  );

  return successResponse(updated);
}

export const POST = withPermission(postHandler, { create: 'purchasing:create' });
