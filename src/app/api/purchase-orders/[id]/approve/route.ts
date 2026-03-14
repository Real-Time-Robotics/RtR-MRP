// =============================================================================
// PO APPROVE
// POST /api/purchase-orders/[id]/approve
// Changes status: pending_approval → approved
// Auth: admin only (CEO-level approval)
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

  const po = await prisma.purchaseOrder.findUnique({ where: { id } });

  if (!po) {
    return NextResponse.json({ success: false, error: 'Đơn mua hàng không tồn tại' }, { status: 404 });
  }

  if (po.status !== 'pending_approval') {
    return NextResponse.json(
      { success: false, error: `Không thể duyệt PO ở trạng thái "${po.status}". Chỉ PO chờ duyệt mới có thể duyệt.` },
      { status: 400 }
    );
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      status: 'approved',
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
    'approved'
  );

  return NextResponse.json({ success: true, data: updated });
});
