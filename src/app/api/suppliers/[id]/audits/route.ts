// =============================================================================
// SUPPLIER AUDITS API
// GET  /api/suppliers/[id]/audits — List audits
// POST /api/suppliers/[id]/audits — Create audit
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
import { createAuditSchema } from '@/lib/validations/supplier-score';
import { auditCreate } from '@/lib/audit/route-audit';
import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

// GET — List audits
async function getHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);

  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) return notFoundResponse('Nhà cung cấp');

  const audits = await prisma.supplierAudit.findMany({
    where: { supplierId: id },
    orderBy: { auditDate: 'desc' },
  });

  return successResponse(audits);
}

// POST — Create audit
async function postHandler(
  request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: AuthUser }
) {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const id = params?.id;
  if (!id) return errorResponse('ID không hợp lệ', 400);

  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) return notFoundResponse('Nhà cung cấp');

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const validation = createAuditSchema.safeParse(body);
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

  const audit = await prisma.supplierAudit.create({
    data: {
      supplierId: id,
      auditDate: new Date(data.auditDate),
      auditType: data.auditType,
      auditorId: user.id,
      score: data.score ?? null,
      findings: data.findings ?? null,
      recommendations: data.recommendations ?? null,
      nextAuditDate: data.nextAuditDate ? new Date(data.nextAuditDate) : null,
      status: data.status,
    },
  });

  auditCreate(
    request,
    { id: user.id, name: user.name, email: user.email },
    'SupplierAudit',
    audit.id,
    { supplierId: id, auditType: data.auditType }
  );

  return successResponse(audit, 201);
}

export const GET = withPermission(getHandler, { read: 'orders:view' });
export const POST = withPermission(postHandler, { create: 'orders:create' });
