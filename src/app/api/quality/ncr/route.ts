import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { generateNCRNumber } from "@/lib/quality/ncr-workflow";
import { buildSearchQuery, parsePaginationParams } from "@/lib/pagination";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

// Validation schema for NCR creation
const NCRCreateSchema = z.object({
  source: z.enum(["receiving", "in_process", "final", "customer_complaint", "supplier"]),
  inspectionId: z.string().optional().nullable(),
  partId: z.string().optional().nullable(),
  productId: z.string().optional().nullable(),
  workOrderId: z.string().optional().nullable(),
  salesOrderId: z.string().optional().nullable(),
  poId: z.string().optional().nullable(),
  lotNumber: z.string().optional().nullable(),
  quantityAffected: z.number().int().min(1, "Số lượng phải >= 1"),
  title: z.string().min(1, "Tiêu đề là bắt buộc").max(200),
  description: z.string().min(1, "Mô tả là bắt buộc").max(5000),
  defectCode: z.string().optional().nullable(),
  defectCategory: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
});

export const GET = withAuth(async (request, _context, _session) => {
  try {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const { page, pageSize } = parsePaginationParams(request);

    const searchQuery = buildSearchQuery(search, ["ncrNumber", "title", "description", "lotNumber"]);
    const where: Record<string, unknown> = {
      ...searchQuery,
    };
    if (status && status !== "all") where.status = status;

    const [ncrs, total] = await Promise.all([
      prisma.nCR.findMany({
        where,
        include: {
          part: { select: { partNumber: true, name: true } },
          product: { select: { sku: true, name: true } },
          workOrder: { select: { woNumber: true } },
          inspection: { select: { inspectionNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.nCR.count({ where }),
    ]);

    return NextResponse.json({
      data: ncrs,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/quality/ncr' });
    return NextResponse.json({ error: "Lỗi tải danh sách NCR" }, { status: 500 });
  }
});

export const POST = withAuth(async (request, context, session) => {
  try {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();

    // Validate request body
    const validationResult = NCRCreateSchema.safeParse(body);
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

    if (data.workOrderId) {
      const wo = await prisma.workOrder.findUnique({ where: { id: data.workOrderId } });
      if (!wo) {
        return NextResponse.json({ error: "Lệnh sản xuất không tồn tại" }, { status: 400 });
      }
    }

    if (data.inspectionId) {
      const inspection = await prisma.inspection.findUnique({ where: { id: data.inspectionId } });
      if (!inspection) {
        return NextResponse.json({ error: "Kiểm tra không tồn tại" }, { status: 400 });
      }
    }

    const ncrNumber = await generateNCRNumber();

    const ncr = await prisma.nCR.create({
      data: {
        ncrNumber,
        source: data.source,
        inspectionId: data.inspectionId || null,
        partId: data.partId || null,
        productId: data.productId || null,
        workOrderId: data.workOrderId || null,
        salesOrderId: data.salesOrderId || null,
        poId: data.poId || null,
        lotNumber: data.lotNumber || null,
        quantityAffected: data.quantityAffected,
        title: data.title,
        description: data.description,
        defectCode: data.defectCode || null,
        defectCategory: data.defectCategory || null,
        priority: data.priority,
        createdBy: session.user.id,
        status: "open",
      },
    });

    // Log initial history
    await prisma.nCRHistory.create({
      data: {
        ncrId: ncr.id,
        action: "CREATED",
        toStatus: "open",
        userId: session.user.id,
      },
    });

    return NextResponse.json(ncr, { status: 201 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/quality/ncr' });
    return NextResponse.json({ error: "Lỗi tạo NCR" }, { status: 500 });
  }
});
