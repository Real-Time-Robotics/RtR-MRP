// =============================================================================
// SEND QUOTATION
// POST /api/quotations/[id]/send — Mark as sent to customer
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

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!quotation) return notFoundResponse('Báo giá');

  if (quotation.status !== 'draft') {
    return errorResponse('Báo giá đã được gửi hoặc không ở trạng thái Nháp', 400);
  }

  if (quotation.items.length === 0) {
    return errorResponse('Báo giá phải có ít nhất 1 sản phẩm trước khi gửi', 400);
  }

  const updated = await prisma.quotation.update({
    where: { id },
    data: {
      status: 'sent',
      sentAt: new Date(),
    },
    include: {
      customer: { select: { id: true, code: true, name: true, contactEmail: true } },
      items: {
        include: { part: { select: { id: true, partNumber: true, name: true } } },
      },
    },
  });

  auditStatusChange(
    request,
    { id: user.id, name: user.name, email: user.email },
    'Quotation',
    id,
    'draft',
    'sent'
  );

  return successResponse(updated);
}

export const POST = withPermission(postHandler, { update: 'orders:edit' });
