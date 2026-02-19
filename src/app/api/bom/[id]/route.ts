import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from '@/lib/api/with-auth';
import { z } from "zod";
import { logger } from "@/lib/logger";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

// Schema for BOM line update
const BomLineUpdateSchema = z.object({
  id: z.string().optional(), // Existing line ID for update
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

// Schema for BOM header update
const BomUpdateSchema = z.object({
  version: z.string().min(1).optional(),
  status: z.enum(["draft", "active", "obsolete"]).optional(),
  effectiveDate: z.string().optional(),
  expiryDate: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  lines: z.array(BomLineUpdateSchema).optional(),
});

// =============================================================================
// GET - Get single BOM by ID
// =============================================================================

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { id } = await context.params;

    const bomHeader = await prisma.bomHeader.findUnique({
      where: { id },
      include: {
        product: {
          select: { id: true, sku: true, name: true },
        },
        bomLines: {
          include: {
            part: {
              select: { id: true, partNumber: true, name: true, unitCost: true, unit: true },
            },
          },
          orderBy: [{ moduleCode: "asc" }, { sequence: "asc" }, { lineNumber: "asc" }],
        },
      },
    });

    if (!bomHeader) {
      return NextResponse.json(
        { error: "BOM không tồn tại" },
        { status: 404 }
      );
    }

    return NextResponse.json(bomHeader);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/bom/[id]' });
    return NextResponse.json(
      { error: "Failed to fetch BOM" },
      { status: 500 }
    );
  }
});

// =============================================================================
// PUT - Update BOM header and lines
// =============================================================================

export const PUT = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { id } = await context.params;

    // Check if BOM exists
    const existingBom = await prisma.bomHeader.findUnique({
      where: { id },
      include: { bomLines: true },
    });

    if (!existingBom) {
      return NextResponse.json(
        { error: "BOM không tồn tại" },
        { status: 404 }
      );
    }

    // Only allow edit for draft BOMs (active BOMs should be versioned)
    if (existingBom.status === "obsolete") {
      return NextResponse.json(
        { error: "Không thể chỉnh sửa BOM đã lỗi thời. Hãy tạo version mới." },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validationResult = BomUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check for version conflict if version is being changed
    if (data.version && data.version !== existingBom.version) {
      const versionConflict = await prisma.bomHeader.findUnique({
        where: {
          productId_version: {
            productId: existingBom.productId,
            version: data.version,
          },
        },
      });
      if (versionConflict) {
        return NextResponse.json(
          { error: `BOM version ${data.version} đã tồn tại cho sản phẩm này` },
          { status: 400 }
        );
      }
    }

    // Validate all parts exist if lines provided
    if (data.lines && data.lines.length > 0) {
      const partIds = data.lines.map((line) => line.partId);
      const parts = await prisma.part.findMany({
        where: { id: { in: partIds } },
        select: { id: true },
      });
      const foundPartIds = new Set(parts.map((p) => p.id));
      const missingParts = partIds.filter((pid) => !foundPartIds.has(pid));
      if (missingParts.length > 0) {
        return NextResponse.json(
          { error: `Parts không tồn tại: ${missingParts.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (data.version !== undefined) updateData.version = data.version;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.effectiveDate !== undefined) updateData.effectiveDate = new Date(data.effectiveDate);
    if (data.expiryDate !== undefined) updateData.expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;
    if (data.notes !== undefined) updateData.notes = data.notes;

    // Handle lines update: delete all and recreate
    if (data.lines !== undefined) {
      // Delete existing lines
      await prisma.bomLine.deleteMany({
        where: { bomId: id },
      });

      // Create new lines
      if (data.lines.length > 0) {
        await prisma.bomLine.createMany({
          data: data.lines.map((line, index) => ({
            bomId: id,
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
        });
      }
    }

    // Update header
    const updatedBom = await prisma.bomHeader.update({
      where: { id },
      data: updateData,
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
    });

    return NextResponse.json(updatedBom);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PUT /api/bom/[id]' });
    return NextResponse.json(
      { error: "Failed to update BOM" },
      { status: 500 }
    );
  }
});

// =============================================================================
// DELETE - Delete BOM (only if draft)
// =============================================================================

export const DELETE = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { id } = await context.params;

    // Check if BOM exists
    const existingBom = await prisma.bomHeader.findUnique({
      where: { id },
    });

    if (!existingBom) {
      return NextResponse.json(
        { error: "BOM không tồn tại" },
        { status: 404 }
      );
    }

    // Only allow delete for draft BOMs
    if (existingBom.status !== "draft") {
      return NextResponse.json(
        { error: "Chỉ có thể xóa BOM ở trạng thái draft. BOM đang active hoặc obsolete cần được đánh dấu obsolete." },
        { status: 400 }
      );
    }

    // Delete lines first (cascade should handle but being explicit)
    await prisma.bomLine.deleteMany({
      where: { bomId: id },
    });

    // Delete header
    await prisma.bomHeader.delete({
      where: { id },
    });

    return NextResponse.json({ message: "BOM đã được xóa thành công" });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'DELETE /api/bom/[id]' });
    return NextResponse.json(
      { error: "Failed to delete BOM" },
      { status: 500 }
    );
  }
});
