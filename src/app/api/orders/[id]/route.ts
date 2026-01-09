
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;

        const order = await prisma.salesOrder.findUnique({
            where: { id },
            include: {
                customer: true,
                lines: {
                    include: {
                        product: true,
                    },
                    orderBy: { lineNumber: 'asc' }
                },
            },
        });

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        return NextResponse.json(order);
    } catch (error) {
        console.error("Failed to fetch order:", error);
        return NextResponse.json(
            { error: "Failed to fetch order details" },
            { status: 500 }
        );
    }
}
