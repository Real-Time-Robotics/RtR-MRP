import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { generateCAPANumber } from "@/lib/quality/capa-workflow";
import { buildSearchQuery, parsePaginationParams } from "@/lib/pagination";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

// Validation schema for CAPA creation
const CAPACreateSchema = z.object({
  type: z.enum(["corrective", "preventive"]),
  source: z.enum(["ncr", "audit", "customer_complaint", "process_improvement", "management_review"]),
  sourceReference: z.string().optional().nullable(),
  title: z.string().min(1, "Tiêu đề là bắt buộc").max(200),
  description: z.string().min(1, "Mô tả là bắt buộc").max(5000),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  ownerId: z.string().optional(),
  targetDate: z.string().optional(),
  ncrIds: z.array(z.string()).optional(),
});

export const GET = withAuth(async (request, _context, _session) => {
  try {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const { page, pageSize } = parsePaginationParams(request);

    const searchQuery = buildSearchQuery(search, ["capaNumber", "title", "description", "sourceReference"]);
    const where: Record<string, unknown> = {
      ...searchQuery,
    };
    if (status && status !== "all") where.status = status;
    if (type && type !== "all") where.type = type;

    const [capas, total] = await Promise.all([
      prisma.cAPA.findMany({
        where,
        include: {
          ncrs: { select: { ncrNumber: true } },
          _count: { select: { actions: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.cAPA.count({ where }),
    ]);

    return NextResponse.json({
      data: capas,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/quality/capa' });
    return NextResponse.json({ error: "Lỗi tải danh sách CAPA" }, { status: 500 });
  }
});

export const POST = withAuth(async (request, context, session) => {
  try {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();

    // Validate request body
    const validationResult = CAPACreateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Validate owner exists if provided
    if (data.ownerId) {
      const owner = await prisma.user.findUnique({ where: { id: data.ownerId } });
      if (!owner) {
        return NextResponse.json({ error: "Người phụ trách không tồn tại" }, { status: 400 });
      }
    }

    // Validate NCRs exist if provided
    if (data.ncrIds && data.ncrIds.length > 0) {
      const ncrs = await prisma.nCR.findMany({
        where: { id: { in: data.ncrIds } },
        select: { id: true },
      });
      const foundIds = new Set(ncrs.map((n) => n.id));
      const missingIds = data.ncrIds.filter((id) => !foundIds.has(id));
      if (missingIds.length > 0) {
        return NextResponse.json(
          { error: `NCR không tồn tại: ${missingIds.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const capaNumber = await generateCAPANumber();

    const capa = await prisma.cAPA.create({
      data: {
        capaNumber,
        type: data.type,
        source: data.source,
        sourceReference: data.sourceReference || null,
        title: data.title,
        description: data.description,
        priority: data.priority,
        ownerId: data.ownerId || session.user.id,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
        originalTargetDate: data.targetDate ? new Date(data.targetDate) : undefined,
        createdBy: session.user.id,
        status: "open",
      },
    });

    // Link NCRs if provided
    if (data.ncrIds && data.ncrIds.length > 0) {
      await prisma.nCR.updateMany({
        where: { id: { in: data.ncrIds } },
        data: { capaId: capa.id },
      });
    }

    // Log initial history
    await prisma.cAPAHistory.create({
      data: {
        capaId: capa.id,
        action: "CREATED",
        toStatus: "open",
        userId: session.user.id,
      },
    });

    return NextResponse.json(capa, { status: 201 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/quality/capa' });
    return NextResponse.json({ error: "Lỗi tạo CAPA" }, { status: 500 });
  }
});
