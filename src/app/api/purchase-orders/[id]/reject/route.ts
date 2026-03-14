// =============================================================================
// PO REJECT
// POST /api/purchase-orders/[id]/reject
// Changes status: pending_approval → rejected
// Auth: admin only (CEO-level rejection)
// Body: { reason: string }
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRoleAuth, type AuthSession, type RouteContext } from '@/lib/api/with-auth';
import { auditStatusChange } from '@/lib/audit/route-audit';
import { checkWriteEndpointLimit } from '@/lib/rate-limit';

export const POST = withRoleAuth(['admin'], async (
  request: NextRequest,
  context: RouteContext,
  session: AuthSession
) => {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ success: false, error: 'ID không hợp lệ' }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { reason } = body;
  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'Lý do từ chối là bắt buộc.' },
      { status: 400 }
    );
  }

  const po = await prisma.purchaseOrder.findUnique({ where: { id } });

  if (!po) {
    return NextResponse.json({ success: false, error: 'Đơn mua hàng không tồn tại' }, { status: 404 });
  }

  if (po.status !== 'pending_approval') {
    return NextResponse.json(
      { success: false, error: `Không thể từ chối PO ở trạng thái "${po.status}". Chỉ PO chờ duyệt mới có thể từ chối.` },
      { status: 400 }
    );
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      status: 'rejected',
      rejectionReason: reason.trim(),
      approvedById: session.user.id,
      approvedAt: new Date(),
    },
    include: {
      supplier: true,
      lines: { include: { part: true }, orderBy: { lineNumber: 'asc' } },
    },
  });

  auditStatusChange(
    request,
    { id: session.user.id, name: session.user.name, email: session.user.email },
    'PurchaseOrder',
    id,
    'pending_approval',
    'rejected'
  );

  return NextResponse.json({ success: true, data: updated });
});
