import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateInspectionNumber } from "@/lib/quality/inspection-engine";
import { z } from "zod";

// Validation schema for Inspection creation
const InspectionCreateSchema = z.object({
  type: z.preprocess(
    (v) => (typeof v === 'string' ? v.toUpperCase() : v),
    z.enum(["RECEIVING", "IN_PROCESS", "FINAL"])
  ),
  planId: z.string().optional().nullable(),
  partId: z.string().optional().nullable(),
  productId: z.string().optional().nullable(),
  poLineId: z.string().optional().nullable(),
  workOrderId: z.string().optional().nullable(),
  salesOrderId: z.string().optional().nullable(),
  lotNumber: z.string().optional().nullable(),
  quantityReceived: z.number().int().min(0).optional(),
  quantityInspected: z.number().int().min(0).optional(),
  warehouseId: z.string().optional().nullable(),
  workCenter: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const [inspections, total] = await Promise.all([
      prisma.inspection.findMany({
        where,
        include: {
          plan: { select: { planNumber: true, name: true } },
          part: { select: { partNumber: true, name: true } },
          product: { select: { sku: true, name: true } },
          workOrder: { select: { woNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.inspection.count({ where }),
    ]);

    return NextResponse.json({
      data: inspections,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error("Lỗi tải danh sách kiểm tra:", error);
    return NextResponse.json(
      { error: "Lỗi tải danh sách kiểm tra" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    const validationResult = InspectionCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Validate entity references exist
    if (data.planId) {
      const plan = await prisma.inspectionPlan.findUnique({ where: { id: data.planId } });
      if (!plan) {
        return NextResponse.json({ error: "Kế hoạch kiểm tra không tồn tại" }, { status: 400 });
      }
    }

    if (data.partId) {
      const part = await prisma.part.findUnique({ where: { id: data.partId } });
      if (!part) {
        return NextResponse.json({ error: "Linh kiện không tồn tại" }, { status: 400 });
      }
    }

    if (data.productId) {
      const product = await prisma.product.findUnique({ where: { id: data.productId } });
      if (!product) {
        return NextResponse.json({ error: "Sản phẩm không tồn tại" }, { status: 400 });
      }
    }

    if (data.workOrderId) {
      const wo = await prisma.workOrder.findUnique({ where: { id: data.workOrderId } });
      if (!wo) {
        return NextResponse.json({ error: "Lệnh sản xuất không tồn tại" }, { status: 400 });
      }
    }

    if (data.warehouseId) {
      const warehouse = await prisma.warehouse.findUnique({ where: { id: data.warehouseId } });
      if (!warehouse) {
        return NextResponse.json({ error: "Kho không tồn tại" }, { status: 400 });
      }
    }

    const inspectionNumber = await generateInspectionNumber(data.type);

    const inspection = await prisma.inspection.create({
      data: {
        inspectionNumber,
        type: data.type,
        planId: data.planId || null,
        partId: data.partId || null,
        productId: data.productId || null,
        poLineId: data.poLineId || null,
        workOrderId: data.workOrderId || null,
        salesOrderId: data.salesOrderId || null,
        lotNumber: data.lotNumber || null,
        quantityReceived: data.quantityReceived || 0,
        quantityInspected: data.quantityInspected || 0,
        inspectedBy: session.user.id,
        warehouseId: data.warehouseId || null,
        workCenter: data.workCenter || null,
        notes: data.notes || null,
        status: "pending",
      },
    });

    return NextResponse.json(inspection, { status: 201 });
  } catch (error) {
    console.error("Lỗi tạo kiểm tra:", error);
    return NextResponse.json(
      { error: "Lỗi tạo kiểm tra" },
      { status: 500 }
    );
  }
}
