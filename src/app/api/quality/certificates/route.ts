import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { generateCertificateNumber } from "@/lib/quality/coc-generator";
import { parsePaginationParams } from "@/lib/pagination";
import { z } from "zod";
import { logger } from "@/lib/logger";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// Validation schema for Certificate creation
const CertificateCreateSchema = z.object({
  salesOrderId: z.string().min(1, "Đơn hàng là bắt buộc"),
  salesOrderLineId: z.string().optional().nullable(),
  productId: z.string().min(1, "Sản phẩm là bắt buộc"),
  lotNumbers: z.array(z.string()).optional(),
  serialNumbers: z.array(z.string()).optional(),
  quantity: z.number().int().min(1, "Số lượng phải >= 1"),
  inspectionId: z.string().optional().nullable(),
  specifications: z.any().optional(), // JSON field
  testResults: z.any().optional(), // JSON field
});

export async function GET(request: NextRequest) {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const { page, pageSize } = parsePaginationParams(request);

    const where: Record<string, unknown> = {};
    if (status && status !== "all") where.status = status;

    const [certificates, total] = await Promise.all([
      prisma.certificateOfConformance.findMany({
        where,
        include: {
          salesOrder: {
            select: {
              orderNumber: true,
              customer: { select: { name: true } },
            },
          },
          product: { select: { sku: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.certificateOfConformance.count({ where }),
    ]);

    return NextResponse.json({
      data: certificates,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/quality/certificates' });
    return NextResponse.json(
      { error: "Lỗi tải danh sách chứng chỉ" },
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
    const validationResult = CertificateCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Validate entity references exist
    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id: data.salesOrderId },
    });
    if (!salesOrder) {
      return NextResponse.json({ error: "Đơn hàng không tồn tại" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });
    if (!product) {
      return NextResponse.json({ error: "Sản phẩm không tồn tại" }, { status: 400 });
    }

    if (data.inspectionId) {
      const inspection = await prisma.inspection.findUnique({
        where: { id: data.inspectionId },
      });
      if (!inspection) {
        return NextResponse.json({ error: "Kiểm tra không tồn tại" }, { status: 400 });
      }
    }

    const certificateNumber = await generateCertificateNumber();

    const certificate = await prisma.certificateOfConformance.create({
      data: {
        certificateNumber,
        salesOrderId: data.salesOrderId,
        salesOrderLineId: data.salesOrderLineId || null,
        productId: data.productId,
        lotNumbers: data.lotNumbers || [],
        serialNumbers: data.serialNumbers || [],
        quantity: data.quantity,
        inspectionId: data.inspectionId || null,
        specifications: data.specifications || null,
        testResults: data.testResults || null,
        preparedBy: session.user?.name || session.user?.email || "System",
        preparedAt: new Date(),
        status: "draft",
      },
    });

    return NextResponse.json(certificate, { status: 201 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/quality/certificates' });
    return NextResponse.json(
      { error: "Lỗi tạo chứng chỉ" },
      { status: 500 }
    );
  }
});
