import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const orders = await prisma.salesOrder.findMany({
      where: status
        ? {
            status: status,
          }
        : undefined,
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
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
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
