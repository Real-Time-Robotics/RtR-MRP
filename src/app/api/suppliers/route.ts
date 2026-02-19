import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { logger } from "@/lib/logger";
import { z } from "zod";
import {
  parsePaginationParams,
  buildOffsetPaginationQuery,
  buildPaginatedResponse,
  buildSearchQuery,
  paginatedSuccess,
  paginatedError,
} from "@/lib/pagination";
import {
  withPermission,
  successResponse,
  errorResponse,
  validationErrorResponse,
  AuthUser,
} from "@/lib/api/with-permission";

import { checkReadEndpointLimit } from '@/lib/rate-limit';
const SEARCH_FIELDS = ["name", "code", "contactEmail", "contactName"];

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const createSupplierSchema = z.object({
  code: z.string().min(1, 'Mã nhà cung cấp là bắt buộc'),
  name: z.string().min(1, 'Tên nhà cung cấp là bắt buộc'),
  taxId: z.string().max(20).nullish(),
  country: z.string().min(1, 'Quốc gia là bắt buộc'),
  ndaaCompliant: z.boolean().default(true),
  contactName: z.string().nullish(),
  contactEmail: z.string().email('Email không hợp lệ').nullish(),
  contactPhone: z.string().nullish(),
  address: z.string().nullish(),
  paymentTerms: z.string().nullish(),
  leadTimeDays: z.number().int().min(0, 'Lead time phải >= 0').default(0),
  rating: z.number().min(0).max(5).nullish(),
  category: z.string().nullish(),
  status: z.enum(['active', 'inactive', 'pending']).default('active'),
});

// =============================================================================
// GET - List suppliers
// =============================================================================

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const startTime = Date.now();

  try {

    // Parse pagination params
    const params = parsePaginationParams(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    // Build where clause
    const searchQuery = buildSearchQuery(search, SEARCH_FIELDS);
    const where = {
      ...searchQuery,
      ...(status && { status }),
    };

    // Get total count and paginated data in parallel
    const [totalCount, suppliers] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        ...buildOffsetPaginationQuery(params),
        orderBy: params.sortBy
          ? { [params.sortBy]: params.sortOrder }
          : { name: "asc" },
      }),
    ]);

    return paginatedSuccess(
      buildPaginatedResponse(suppliers, totalCount, params, startTime),
      { cacheControl: 'private, max-age=60, stale-while-revalidate=120' },
    );
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/suppliers' });
    return paginatedError("Lỗi tải danh sách nhà cung cấp", 500);
  }
});

// =============================================================================
// POST - Create supplier
// =============================================================================

async function postHandler(
  request: NextRequest,
  { user }: { params?: Record<string, string>; user: AuthUser }
) {
  // Parse and validate body
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Dữ liệu JSON không hợp lệ', 400);
  }

  const validation = createSupplierSchema.safeParse(body);
  if (!validation.success) {
    const errors: Record<string, string[]> = {};
    validation.error.issues.forEach((err) => {
      const path = err.path.join('.');
      if (!errors[path]) errors[path] = [];
      errors[path].push(err.message);
    });
    return validationErrorResponse(errors);
  }

  // Check unique code
  const codeExists = await prisma.supplier.findUnique({
    where: { code: validation.data.code },
  });
  if (codeExists) {
    return errorResponse('Mã nhà cung cấp đã tồn tại', 409);
  }

  // Check duplicate taxId if provided
  if (validation.data.taxId) {
    const taxIdExists = await prisma.supplier.findFirst({
      where: { taxId: validation.data.taxId },
    });
    if (taxIdExists) {
      return validationErrorResponse({
        taxId: [`Mã số thuế đã tồn tại cho nhà cung cấp: ${taxIdExists.name} (${taxIdExists.code})`],
      });
    }
  }

  // Create supplier
  const supplier = await prisma.supplier.create({
    data: {
      ...validation.data,
    },
  });

  return successResponse(supplier, 201);
}

export const POST = withPermission(postHandler, {
  create: 'orders:create',
});
