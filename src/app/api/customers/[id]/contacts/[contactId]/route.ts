// =============================================================================
// CUSTOMER CONTACT DETAIL API
// GET    /api/customers/[id]/contacts/[contactId] — Get contact
// PUT    /api/customers/[id]/contacts/[contactId] — Update contact
// DELETE /api/customers/[id]/contacts/[contactId] — Delete contact
// =============================================================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  withPermission,
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
  AuthUser,
} from '@/lib/api/with-permission';
import { updateContactSchema } from '@/lib/validations/customer-credit';
import { auditUpdate, auditDelete } from '@/lib/audit/route-audit';
import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

// =============================================================================
// GET
// =============================================================================

async function getHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const id = params?.id;
  const contactId = params?.contactId;
  if (!id || !contactId) return errorResponse('ID không hợp lệ', 400);

  const contact = await prisma.customerContact.findFirst({
    where: { id: contactId, customerId: id },
  });

  if (!contact) return notFoundResponse('Liên hệ');
  return successResponse(contact);
}

// =============================================================================
// PUT
// =============================================================================

async function putHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const id = params?.id;
  const contactId = params?.contactId;
  if (!id || !contactId) return errorResponse('ID không hợp lệ', 400);

  const existing = await prisma.customerContact.findFirst({
    where: { id: contactId, customerId: id },
  });
  if (!existing) return notFoundResponse('Liên hệ');

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const validation = updateContactSchema.safeParse(body);
  if (!validation.success) {
    const errors: Record<string, string[]> = {};
    validation.error.issues.forEach((err) => {
      const path = err.path.join('.') || '_root';
      if (!errors[path]) errors[path] = [];
      errors[path].push(err.message);
    });
    return validationErrorResponse(errors);
  }

  const data = validation.data;

  // If setting as primary, unset others
  if (data.isPrimary && !existing.isPrimary) {
    await prisma.customerContact.updateMany({
      where: { customerId: id, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  const contact = await prisma.customerContact.update({
    where: { id: contactId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.title !== undefined && { title: data.title || null }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.mobile !== undefined && { mobile: data.mobile || null }),
      ...(data.contactType !== undefined && { contactType: data.contactType }),
      ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
    },
  });

  auditUpdate(
    request,
    { id: user.id, name: user.name, email: user.email },
    'CustomerContact',
    contactId,
    existing as unknown as Record<string, unknown>,
    data as Record<string, unknown>
  );

  return successResponse(contact);
}

// =============================================================================
// DELETE
// =============================================================================

async function deleteHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const id = params?.id;
  const contactId = params?.contactId;
  if (!id || !contactId) return errorResponse('ID không hợp lệ', 400);

  const existing = await prisma.customerContact.findFirst({
    where: { id: contactId, customerId: id },
  });
  if (!existing) return notFoundResponse('Liên hệ');

  await prisma.customerContact.delete({ where: { id: contactId } });

  auditDelete(
    request,
    { id: user.id, name: user.name, email: user.email },
    'CustomerContact',
    contactId,
    { name: existing.name, contactType: existing.contactType }
  );

  return successResponse({ deleted: true, id: contactId });
}

// =============================================================================
// EXPORTS
// =============================================================================

export const GET = withPermission(getHandler, { read: 'orders:view' });
export const PUT = withPermission(putHandler, { update: 'orders:edit' });
export const DELETE = withPermission(deleteHandler, { delete: 'orders:delete' });
