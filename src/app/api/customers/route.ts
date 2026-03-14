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
const SEARCH_FIELDS = ["name", "code", "contactName", "contactEmail"];

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const createCustomerSchema = z.object({
  code: z.string().min(1, 'Mã khách hàng là bắt buộc'),
  name: z.string().min(1, 'Tên khách hàng là bắt buộc'),
  type: z.string().nullish(),
  country: z.string().nullish(),
  contactName: z.string().nullish(),
  contactEmail: z.string().email('Email không hợp lệ').nullish().or(z.literal('')),
  contactPhone: z.string().nullish(),
  billingAddress: z.string().nullish(),
  paymentTerms: z.string().nullish(),
  creditLimit: z.number().min(0).optional().default(0),
  status: z.enum(['active', 'inactive', 'pending']).default('active'),
});

// =============================================================================
// GET - List customers
// =============================================================================

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const startTime = Date.now();

  try {
    const params = parsePaginationParams(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const searchQuery = buildSearchQuery(search, SEARCH_FIELDS);
    const where = {
      ...searchQuery,
      ...(status && { status }),
      ...(type && { type }),
    };

    const [totalCount, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        ...buildOffsetPaginationQuery(params),
        orderBy: params.sortBy
          ? { [params.sortBy]: params.sortOrder }
          : { name: "asc" },
        include: {
          _count: {
            select: { salesOrders: true },
          },
        },
      }),
    ]);

    return paginatedSuccess(
      buildPaginatedResponse(customers, totalCount, params, startTime),
      { cacheControl: 'private, max-age=60, stale-while-revalidate=120' },
    );
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/customers' });
    return paginatedError("Lỗi tải danh sách khách hàng", 500);
  }
});

// =============================================================================
// POST - Create customer
// =============================================================================

async function postHandler(
  request: NextRequest,
  { user }: { params?: Record<string, string>; user: AuthUser }
) {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/customers', detail: 'Invalid JSON body' });
    return errorResponse('Dữ liệu JSON không hợp lệ', 400);
  }

  const validation = createCustomerSchema.safeParse(body);
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
  const codeExists = await prisma.customer.findUnique({
    where: { code: validation.data.code },
  });
  if (codeExists) {
    return errorResponse('Mã khách hàng đã tồn tại', 409);
  }

  const customer = await prisma.customer.create({
    data: {
      ...validation.data,
      contactEmail: validation.data.contactEmail || null,
    },
  });

  return successResponse(customer, 201);
}

export const POST = withPermission(postHandler, {
  create: 'orders:create',
});
