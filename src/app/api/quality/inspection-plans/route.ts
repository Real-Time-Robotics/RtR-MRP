import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { generateInspectionPlanNumber } from "@/lib/quality/inspection-engine";
import { buildSearchQuery, parsePaginationParams } from "@/lib/pagination";
import { z } from "zod";
import { logger } from "@/lib/logger";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// Validation schema for Inspection Characteristic
const CharacteristicSchema = z.object({
  name: z.string().min(1, "Tên là bắt buộc").max(100),
  description: z.string().max(500).optional().nullable(),
  type: z.enum(["variable", "attribute"]),
  specification: z.string().optional().nullable(),
  nominalValue: z.number().optional().nullable(),
  upperLimit: z.number().optional().nullable(),
  lowerLimit: z.number().optional().nullable(),
  unitOfMeasure: z.string().optional().nullable(),
  acceptanceCriteria: z.string().optional().nullable(),
  isCritical: z.boolean().default(false),
  isMajor: z.boolean().default(false),
  gageRequired: z.string().optional().nullable(),
});

// Validation schema for Inspection Plan creation
const InspectionPlanCreateSchema = z.object({
  name: z.string().min(1, "Tên kế hoạch là bắt buộc").max(200),
  description: z.string().max(2000).optional().nullable(),
  type: z.enum(["receiving", "in_process", "final"]),
  partId: z.string().optional().nullable(),
  productId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  sampleSize: z.string().optional().nullable(), // "100%", "AQL 1.0", etc.
  sampleMethod: z.string().optional().nullable(),
  characteristics: z.array(CharacteristicSchema).optional(),
});

export async function GET(request: NextRequest) {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const { page, pageSize } = parsePaginationParams(request);

    const searchQuery = buildSearchQuery(search, ["planNumber", "name", "description"]);
    const where: Record<string, unknown> = {
      ...searchQuery,
    };
    if (type) where.type = type;
    if (status) where.status = status;

    const [plans, total] = await Promise.all([
      prisma.inspectionPlan.findMany({
        where,
        include: {
          part: { select: { partNumber: true, name: true } },
          product: { select: { sku: true, name: true } },
          supplier: { select: { code: true, name: true } },
          _count: { select: { characteristics: true, inspections: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.inspectionPlan.count({ where }),
    ]);

    return NextResponse.json({
      data: plans,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/quality/inspection-plans' });
    return NextResponse.json(
      { error: "Lỗi tải danh sách kế hoạch kiểm tra" },
      { status: 500 }
    );
  }
}

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {

    const body = await request.json();

    // Validate request body
    const validationResult = InspectionPlanCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Validate entity references exist
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

    if (data.supplierId) {
      const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
      if (!supplier) {
        return NextResponse.json({ error: "Nhà cung cấp không tồn tại" }, { status: 400 });
      }
    }

    const planNumber = await generateInspectionPlanNumber();

    const plan = await prisma.inspectionPlan.create({
      data: {
        planNumber,
        name: data.name,
        description: data.description || null,
        type: data.type,
        partId: data.partId || null,
        productId: data.productId || null,
        supplierId: data.supplierId || null,
        sampleSize: data.sampleSize || null,
        sampleMethod: data.sampleMethod || null,
        createdBy: session.user.id,
        status: "draft",
      },
    });

    // Create characteristics if provided
    if (data.characteristics && data.characteristics.length > 0) {
      await prisma.inspectionCharacteristic.createMany({
        data: data.characteristics.map((char, index) => ({
          planId: plan.id,
          sequence: index + 1,
          name: char.name,
          description: char.description || null,
          type: char.type,
          specification: char.specification || null,
          nominalValue: char.nominalValue || null,
          upperLimit: char.upperLimit || null,
          lowerLimit: char.lowerLimit || null,
          unitOfMeasure: char.unitOfMeasure || null,
          acceptanceCriteria: char.acceptanceCriteria || null,
          isCritical: char.isCritical,
          isMajor: char.isMajor,
          gageRequired: char.gageRequired || null,
        })),
      });
    }

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/quality/inspection-plans' });
    return NextResponse.json(
      { error: "Lỗi tạo kế hoạch kiểm tra" },
      { status: 500 }
    );
  }
});
