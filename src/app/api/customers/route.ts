import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
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
} from "@/lib/api/with-permission";

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
  creditLimit: z.number().min(0).nullish(),
  status: z.enum(['active', 'inactive', 'pending']).default('active'),
});

// =============================================================================
// GET - List customers
// =============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      buildPaginatedResponse(customers, totalCount, params, startTime)
    );
  } catch (error) {
    console.error("Failed to fetch customers:", error);
    return paginatedError("Failed to fetch customers", 500);
  }
}

// =============================================================================
// POST - Create customer
// =============================================================================

async function postHandler(
  request: NextRequest,
  { user }: { params?: Record<string, string>; user: any }
) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const validation = createCustomerSchema.safeParse(body);
  if (!validation.success) {
    const errors: Record<string, string[]> = {};
    validation.error.errors.forEach((err) => {
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
