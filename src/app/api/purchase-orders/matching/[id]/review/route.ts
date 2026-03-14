// =============================================================================
// MISMATCH REVIEW API
// POST /api/purchase-orders/matching/[id]/review — Approve/Reject mismatch
// Auth: admin or manager only
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withRoleAuth, type AuthSession, type RouteContext } from '@/lib/api/with-auth';
import { auditStatusChange } from '@/lib/audit/route-audit';
import { checkWriteEndpointLimit } from '@/lib/rate-limit';

const reviewSchema = z.object({
  action: z.enum(['approve', 'reject'], { message: 'Hành động là bắt buộc (approve/reject)' }),
  resolution: z.enum(['approved_as_is', 'adjusted', 'rejected', 'credited']).optional(),
  notes: z.string().optional(),
});

export const POST = withRoleAuth(['admin', 'manager'], async (
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

  const validation = reviewSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: validation.error.issues[0].message },
      { status: 400 }
    );
  }

  const { action, resolution, notes } = validation.data;

  const match = await prisma.threeWayMatch.findUnique({ where: { id } });

  if (!match) {
    return NextResponse.json(
      { success: false, error: 'Bản ghi đối chiếu không tồn tại' },
      { status: 404 }
    );
  }

  if (match.status !== 'mismatch_pending_review') {
    return NextResponse.json(
      { success: false, error: `Bản ghi không ở trạng thái chờ xem xét (hiện tại: "${match.status}").` },
      { status: 400 }
    );
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected';

  const updated = await prisma.threeWayMatch.update({
    where: { id },
    data: {
      status: newStatus,
      reviewedById: session.user.id,
      reviewedAt: new Date(),
      reviewNotes: notes,
      resolution: resolution || (action === 'approve' ? 'approved_as_is' : 'rejected'),
    },
    include: {
      purchaseOrder: { select: { id: true, poNumber: true } },
      grn: { select: { id: true, grnNumber: true } },
    },
  });

  auditStatusChange(
    request,
    { id: session.user.id, name: session.user.name, email: session.user.email },
    'ThreeWayMatch',
    id,
    'mismatch_pending_review',
    newStatus
  );

  return NextResponse.json({ success: true, data: updated });
});
