import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { logger } from "@/lib/logger";
import { z } from "zod";
import {
  parsePaginationParams,
  buildOffsetPaginationQuery,
  buildPaginatedResponse,
  buildFilterQuery,
  buildSearchQuery,
  paginatedSuccess,
  paginatedError,
} from "@/lib/pagination";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// Validation schema for order items
const OrderItemSchema = z.object({
  productId: z.string().min(1, "Product ID là bắt buộc"),
  quantity: z.number().int().min(1, "Số lượng phải >= 1"),
  unitPrice: z.number().min(0, "Đơn giá phải >= 0"),
});

// Validation schema for creating an order
const OrderCreateSchema = z.object({
  customerId: z.string().min(1, "Customer ID là bắt buộc"),
  requiredDate: z.string().min(1, "Ngày yêu cầu là bắt buộc"),
  items: z.array(OrderItemSchema).min(1, "Đơn hàng phải có ít nhất 1 sản phẩm"),
  notes: z.string().max(2000).optional().nullable(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

// Allowed filters for sales orders
const ALLOWED_FILTERS = ["status", "customerId"];
const SEARCH_FIELDS = ["orderNumber"];

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

    // Build where clause
    const filters = buildFilterQuery(request, ALLOWED_FILTERS);
    const searchQuery = buildSearchQuery(search, SEARCH_FIELDS);

    const where = {
      ...filters,
      ...searchQuery,
    };

    // Get total count and paginated data in parallel
    const [totalCount, orders] = await Promise.all([
      prisma.salesOrder.count({ where }),
      prisma.salesOrder.findMany({
        where,
        ...buildOffsetPaginationQuery(params),
        orderBy: params.sortBy
          ? { [params.sortBy]: params.sortOrder }
          : { createdAt: "desc" },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          lines: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
            },
            take: 10, // Limit lines per order for list view
          },
        },
      }),
    ]);

    return paginatedSuccess(
      buildPaginatedResponse(orders, totalCount, params, startTime)
    );
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/orders' });
    return paginatedError("Failed to fetch orders", 500);
  }
});

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const body = await request.json();

    // Validate request body
    const validationResult = OrderCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });
    if (!customer) {
      return NextResponse.json(
        { error: "Khách hàng không tồn tại" },
        { status: 400 }
      );
    }

    // Check if all products exist
    const productIds = data.items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });
    const foundProductIds = new Set(products.map((p) => p.id));
    const missingProducts = productIds.filter((id) => !foundProductIds.has(id));
    if (missingProducts.length > 0) {
      return NextResponse.json(
        { error: `Sản phẩm không tồn tại: ${missingProducts.join(", ")}` },
        { status: 400 }
      );
    }

    // Calculate total amount
    const totalAmount = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    // Generate order number
    const lastOrder = await prisma.salesOrder.findFirst({
      orderBy: { orderNumber: "desc" },
    });
    const nextNum = lastOrder
      ? parseInt(lastOrder.orderNumber.replace("SO-", "")) + 1
      : 1;
    const orderNumber = `SO-${nextNum.toString().padStart(5, "0")}`;

    // Create order with lines
    const order = await prisma.salesOrder.create({
      data: {
        orderNumber,
        customerId: data.customerId,
        orderDate: new Date(),
        requiredDate: new Date(data.requiredDate),
        notes: data.notes || null,
        priority: data.priority,
        totalAmount,
        status: "draft",
        lines: {
          create: data.items.map((item, index) => ({
            lineNumber: index + 1,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        customer: {
          select: { id: true, name: true, code: true },
        },
        lines: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/orders' });
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
});
