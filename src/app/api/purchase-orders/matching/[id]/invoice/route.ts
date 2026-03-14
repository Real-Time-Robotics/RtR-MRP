// =============================================================================
// ADD INVOICE TO MATCH
// POST /api/purchase-orders/matching/[id]/invoice — Attach invoice data
// =============================================================================

import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  withPermission,
  successResponse,
  errorResponse,
  notFoundResponse,
  AuthUser,
} from '@/lib/api/with-permission';
import { updateMatchWithInvoice } from '@/lib/purchasing/three-way-match';
import { checkWriteEndpointLimit } from '@/lib/rate-limit';

const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'Số hóa đơn không được trống'),
  invoiceAmount: z.number().positive('Số tiền phải lớn hơn 0'),
  invoiceDate: z.string().or(z.date()),
  purchaseInvoiceId: z.string().optional(),
});

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
    return errorResponse('Invalid JSON body', 400);
  }

  const validation = invoiceSchema.safeParse(body);
  if (!validation.success) {
    return errorResponse(validation.error.issues[0].message, 400);
  }

  const { invoiceNumber, invoiceAmount, invoiceDate, purchaseInvoiceId } = validation.data;

  const updated = await updateMatchWithInvoice(
    id,
    invoiceNumber,
    invoiceAmount,
    new Date(invoiceDate),
    purchaseInvoiceId
  );

  if (!updated) {
    return notFoundResponse('Bản ghi đối chiếu');
  }

  return successResponse(updated);
}

export const POST = withPermission(postHandler, { create: 'purchasing:create' });
