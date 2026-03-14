// =============================================================================
// SUPPLIER AUDIT DETAIL API
// GET    /api/suppliers/[id]/audits/[auditId] — Get audit
// PUT    /api/suppliers/[id]/audits/[auditId] — Update audit
// DELETE /api/suppliers/[id]/audits/[auditId] — Delete audit
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
import { updateAuditSchema } from '@/lib/validations/supplier-score';
import { auditUpdate, auditDelete } from '@/lib/audit/route-audit';
import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

// GET — Single audit
async function getHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const auditId = params?.auditId;
  if (!auditId) return errorResponse('Audit ID không hợp lệ', 400);

  const audit = await prisma.supplierAudit.findUnique({
    where: { id: auditId },
  });

  if (!audit) return notFoundResponse('Supplier Audit');

  return successResponse(audit);
}

// PUT — Update audit
async function putHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const auditId = params?.auditId;
  if (!auditId) return errorResponse('Audit ID không hợp lệ', 400);

  const existing = await prisma.supplierAudit.findUnique({
    where: { id: auditId },
  });
  if (!existing) return notFoundResponse('Supplier Audit');

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const validation = updateAuditSchema.safeParse(body);
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

  const audit = await prisma.supplierAudit.update({
    where: { id: auditId },
    data: {
      ...(data.auditDate !== undefined && { auditDate: new Date(data.auditDate) }),
      ...(data.auditType !== undefined && { auditType: data.auditType }),
      ...(data.score !== undefined && { score: data.score }),
      ...(data.findings !== undefined && { findings: data.findings }),
      ...(data.recommendations !== undefined && { recommendations: data.recommendations }),
      ...(data.nextAuditDate !== undefined && {
        nextAuditDate: data.nextAuditDate ? new Date(data.nextAuditDate) : null,
      }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });

  auditUpdate(
    request,
    { id: user.id, name: user.name, email: user.email },
    'SupplierAudit',
    auditId,
    existing as unknown as Record<string, unknown>,
    data as Record<string, unknown>
  );

  return successResponse(audit);
}

// DELETE — Delete audit
async function deleteHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const auditId = params?.auditId;
  if (!auditId) return errorResponse('Audit ID không hợp lệ', 400);

  const existing = await prisma.supplierAudit.findUnique({
    where: { id: auditId },
  });
  if (!existing) return notFoundResponse('Supplier Audit');

  await prisma.supplierAudit.delete({ where: { id: auditId } });

  auditDelete(
    request,
    { id: user.id, name: user.name, email: user.email },
    'SupplierAudit',
    auditId,
    { auditType: existing.auditType, supplierId: existing.supplierId }
  );

  return successResponse({ deleted: true, id: auditId });
}

export const GET = withPermission(getHandler, { read: 'orders:view' });
export const PUT = withPermission(putHandler, { update: 'orders:edit' });
export const DELETE = withPermission(deleteHandler, { delete: 'orders:delete' });
