import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

// Validation schema for Inspection Plan update
const InspectionPlanUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(["draft", "active", "obsolete"]).optional(),
  sampleSize: z.string().optional().nullable(), // "100%", "AQL 1.0", etc.
  sampleMethod: z.string().optional().nullable(),
  effectiveDate: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const plan = await prisma.inspectionPlan.findUnique({
      where: { id },
      include: {
        part: { select: { partNumber: true, name: true } },
        product: { select: { sku: true, name: true } },
        supplier: { select: { code: true, name: true } },
        characteristics: {
          orderBy: { sequence: "asc" },
        },
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Kế hoạch kiểm tra không tồn tại" },
        { status: 404 }
      );
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Lỗi tải kế hoạch kiểm tra:", error);
    return NextResponse.json(
      { error: "Lỗi tải kế hoạch kiểm tra" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { id } = await params;

    // Check if plan exists
    const existing = await prisma.inspectionPlan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Kế hoạch kiểm tra không tồn tại" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validationResult = InspectionPlanUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Build update data (only update provided fields)
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.sampleSize !== undefined) updateData.sampleSize = data.sampleSize;
    if (data.sampleMethod !== undefined) updateData.sampleMethod = data.sampleMethod;
    if (data.effectiveDate !== undefined) updateData.effectiveDate = new Date(data.effectiveDate);

    const plan = await prisma.inspectionPlan.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Lỗi cập nhật kế hoạch kiểm tra:", error);
    return NextResponse.json(
      { error: "Lỗi cập nhật kế hoạch kiểm tra" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { id } = await params;

    // Check if plan exists
    const existing = await prisma.inspectionPlan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Kế hoạch kiểm tra không tồn tại" },
        { status: 404 }
      );
    }

    await prisma.inspectionPlan.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lỗi xóa kế hoạch kiểm tra:", error);
    return NextResponse.json(
      { error: "Lỗi xóa kế hoạch kiểm tra" },
      { status: 500 }
    );
  }
}
