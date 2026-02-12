import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { confirmDelivery } from "@/lib/mrp-engine";

// GET /api/shipments/[id] — Get shipment detail
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shipment = await prisma.shipment.findUnique({
      where: { id: params.id },
      include: {
        salesOrder: true,
        customer: true,
        lines: {
          include: { product: true },
          orderBy: { lineNumber: "asc" },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json(
        { error: "Phiếu xuất kho không tồn tại" },
        { status: 404 }
      );
    }

    return NextResponse.json(shipment);
  } catch (error) {
    console.error("Failed to fetch shipment:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải phiếu xuất kho" },
      { status: 500 }
    );
  }
}

// PATCH /api/shipments/[id] — Update shipment (e.g. confirm delivery)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;
    const userId = session.user.id || session.user.email || "system";

    if (action === "deliver") {
      const result = await confirmDelivery(params.id, userId);
      return NextResponse.json({
        success: true,
        shipment: result.shipment,
        message: result.message,
      });
    }

    return NextResponse.json(
      { error: "Action không hợp lệ" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Failed to update shipment:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi khi cập nhật phiếu xuất kho" },
      { status: 400 }
    );
  }
}
