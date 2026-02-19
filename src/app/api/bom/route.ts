import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from '@/lib/api/with-auth';
import { z } from "zod";
import { logger } from "@/lib/logger";
import { parsePaginationParams } from "@/lib/pagination";
import { handleError } from "@/lib/error-handler";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// Validation schema for BOM line
const BomLineSchema = z.object({
  partId: z.string().min(1, "Part ID là bắt buộc"),
  quantity: z.number().min(0.001, "Số lượng phải > 0"),
  unit: z.string().default("pcs"),
  level: z.number().int().min(1).default(1),
  moduleCode: z.string().optional().nullable(),
  moduleName: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  isCritical: z.boolean().default(false),
  scrapRate: z.number().min(0).max(100).default(0),
  notes: z.string().optional().nullable(),
  findNumber: z.number().int().optional().nullable(),
  referenceDesignator: z.string().optional().nullable(),
});

// Validation schema for BOM header
const BomCreateSchema = z.object({
  productId: z.string().min(1, "Product ID là bắt buộc"),
  version: z.string().min(1).default("1.0"),
  status: z.enum(["draft", "active", "obsolete"]).default("draft"),
  effectiveDate: z.string().optional(),
  expiryDate: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  lines: z.array(BomLineSchema).optional(),
});

// GET - List all BOM headers with lines
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const status = searchParams.get("status");
    const { page, pageSize } = parsePaginationParams(request);

    const where: Record<string, unknown> = {};
    if (productId) where.productId = productId;
    if (status) where.status = status;

    const [bomHeaders, total] = await Promise.all([
      prisma.bomHeader.findMany({
        where,
        include: {
          product: {
            select: { id: true, sku: true, name: true },
          },
          bomLines: {
            include: {
              part: {
                select: { id: true, partNumber: true, name: true, unitCost: true },
              },
            },
            orderBy: [{ moduleCode: "asc" }, { sequence: "asc" }, { lineNumber: "asc" }],
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.bomHeader.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: bomHeaders,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/bom' });
    return NextResponse.json(
      { success: false, error: "Failed to fetch BOMs" },
      { status: 500 }
    );
  }
});

// POST - Create new BOM header with lines
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const body = await request.json();

    // Validate request body
    const validationResult = BomCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });
    if (!product) {
      return NextResponse.json(
        { error: "Sản phẩm không tồn tại" },
        { status: 400 }
      );
    }

    // Check if version already exists for this product
    const existingBom = await prisma.bomHeader.findUnique({
      where: {
        productId_version: {
          productId: data.productId,
          version: data.version,
        },
      },
    });
    if (existingBom) {
      return NextResponse.json(
        { error: `BOM version ${data.version} đã tồn tại cho sản phẩm này` },
        { status: 400 }
      );
    }

    // Validate all parts exist if lines provided
    if (data.lines && data.lines.length > 0) {
      const partIds = data.lines.map((line) => line.partId);
      const parts = await prisma.part.findMany({
        where: { id: { in: partIds } },
        select: { id: true },
      });
      const foundPartIds = new Set(parts.map((p) => p.id));
      const missingParts = partIds.filter((id) => !foundPartIds.has(id));
      if (missingParts.length > 0) {
        return NextResponse.json(
          { error: `Parts không tồn tại: ${missingParts.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Create BOM header with lines
    const bomHeader = await prisma.bomHeader.create({
      data: {
        productId: data.productId,
        version: data.version,
        status: data.status,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : new Date(),
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        notes: data.notes || null,
        // Create lines if provided
        ...(data.lines && data.lines.length > 0 && {
          bomLines: {
            create: data.lines.map((line, index) => ({
              lineNumber: index + 1,
              partId: line.partId,
              quantity: line.quantity,
              unit: line.unit || "pcs",
              level: line.level || 1,
              moduleCode: line.moduleCode || null,
              moduleName: line.moduleName || null,
              position: line.position || null,
              isCritical: line.isCritical || false,
              scrapRate: line.scrapRate || 0,
              notes: line.notes || null,
              findNumber: line.findNumber || null,
              referenceDesignator: line.referenceDesignator || null,
            })),
          },
        }),
      },
      include: {
        product: {
          select: { id: true, sku: true, name: true },
        },
        bomLines: {
          include: {
            part: {
              select: { id: true, partNumber: true, name: true, unitCost: true },
            },
          },
          orderBy: { lineNumber: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, data: bomHeader }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
});
