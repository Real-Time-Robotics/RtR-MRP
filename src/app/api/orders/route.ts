import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  parsePaginationParams,
  buildOffsetPaginationQuery,
  buildPaginatedResponse,
  buildFilterQuery,
  buildSearchQuery,
  paginatedSuccess,
  paginatedError,
} from "@/lib/pagination";

// Allowed filters for sales orders
const ALLOWED_FILTERS = ["status", "customerId"];
const SEARCH_FIELDS = ["orderNumber"];

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    console.error("Failed to fetch orders:", error);
    return paginatedError("Failed to fetch orders", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { customerId, requiredDate, items, notes } = body;

    // Generate order number
    const lastOrder = await prisma.salesOrder.findFirst({
      orderBy: { orderNumber: "desc" },
    });
    const nextNum = lastOrder
      ? parseInt(lastOrder.orderNumber.replace("SO-", "")) + 1
      : 1;
    const orderNumber = `SO-${nextNum.toString().padStart(5, "0")}`;

    const order = await prisma.salesOrder.create({
      data: {
        orderNumber,
        customerId,
        orderDate: new Date(),
        requiredDate: new Date(requiredDate),
        notes,
        lines: {
          create: items.map(
            (item: { productId: string; quantity: number; unitPrice: number }, index: number) => ({
              lineNumber: index + 1,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })
          ),
        },
      },
      include: {
        customer: true,
        lines: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Failed to create order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
