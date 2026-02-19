import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { z } from "zod";
import { logger } from "@/lib/logger";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
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
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/quality/inspection-plans/[id]' });
    return NextResponse.json(
      { error: "Lỗi tải kế hoạch kiểm tra" },
      { status: 500 }
    );
  }
}

export const PATCH = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;

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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PATCH /api/quality/inspection-plans/[id]' });
    return NextResponse.json(
      { error: "Lỗi cập nhật kế hoạch kiểm tra" },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;

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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'DELETE /api/quality/inspection-plans/[id]' });
    return NextResponse.json(
      { error: "Lỗi xóa kế hoạch kiểm tra" },
      { status: 500 }
    );
  }
});
