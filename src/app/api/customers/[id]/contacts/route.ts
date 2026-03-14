// =============================================================================
// CUSTOMER CONTACTS API
// GET  /api/customers/[id]/contacts — List contacts
// POST /api/customers/[id]/contacts — Add contact
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
import { createContactSchema } from '@/lib/validations/customer-credit';
import { auditCreate } from '@/lib/audit/route-audit';
import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

// =============================================================================
// GET — List contacts
// =============================================================================

async function getHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);

  const customer = await prisma.customer.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!customer) return notFoundResponse('Khách hàng');

  const contacts = await prisma.customerContact.findMany({
    where: { customerId: id },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  });

  return successResponse(contacts);
}

// =============================================================================
// POST — Add contact
// =============================================================================

async function postHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);

  const customer = await prisma.customer.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!customer) return notFoundResponse('Khách hàng');

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const validation = createContactSchema.safeParse(body);
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

  // If this contact is primary, unset other primary contacts
  if (data.isPrimary) {
    await prisma.customerContact.updateMany({
      where: { customerId: id, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  const contact = await prisma.customerContact.create({
    data: {
      customerId: id,
      name: data.name,
      title: data.title || null,
      email: data.email || null,
      phone: data.phone || null,
      mobile: data.mobile || null,
      contactType: data.contactType,
      isPrimary: data.isPrimary,
      notes: data.notes || null,
    },
  });

  auditCreate(
    request,
    { id: user.id, name: user.name, email: user.email },
    'CustomerContact',
    contact.id,
    { name: data.name, contactType: data.contactType, customerId: id }
  );

  return successResponse(contact, 201);
}

// =============================================================================
// EXPORTS
// =============================================================================

export const GET = withPermission(getHandler, { read: 'orders:view' });
export const POST = withPermission(postHandler, { create: 'orders:create' });
