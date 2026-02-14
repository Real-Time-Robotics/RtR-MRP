import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { transitionNCR } from "@/lib/quality/ncr-workflow";
import { z } from "zod";
import { logger } from "@/lib/logger";

// Validation schema for NCR update
const NCRUpdateSchema = z.object({
  action: z.string().optional(), // Workflow transition action
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  defectCode: z.string().optional().nullable(),
  defectCategory: z.string().optional().nullable(),
  preliminaryCause: z.string().optional().nullable(),
  containmentAction: z.string().optional().nullable(),
  disposition: z.string().optional().nullable(),
  dispositionReason: z.string().optional().nullable(),
  reworkInstructions: z.string().optional().nullable(),
  closureNotes: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const ncr = await prisma.nCR.findUnique({
      where: { id },
      include: {
        part: { select: { partNumber: true, name: true } },
        product: { select: { sku: true, name: true } },
        workOrder: { select: { woNumber: true } },
        inspection: { select: { inspectionNumber: true } },
        capa: { select: { capaNumber: true } },
        history: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!ncr) {
      return NextResponse.json({ error: "NCR not found" }, { status: 404 });
    }

    return NextResponse.json(ncr);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/quality/ncr/[id]' });
    return NextResponse.json({ error: "Failed to fetch NCR" }, { status: 500 });
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

    // Check if NCR exists
    const existing = await prisma.nCR.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "NCR không tồn tại" }, { status: 404 });
    }

    const body = await request.json();

    // Validate request body
    const validationResult = NCRUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // If action is provided, use the workflow transition
    if (data.action) {
      const result = await transitionNCR(id, data.action, session.user.id, body);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      const updatedNCR = await prisma.nCR.findUnique({ where: { id } });
      return NextResponse.json(updatedNCR);
    }

    // Otherwise, do a regular update (only update provided fields)
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.defectCode !== undefined) updateData.defectCode = data.defectCode;
    if (data.defectCategory !== undefined) updateData.defectCategory = data.defectCategory;
    if (data.preliminaryCause !== undefined) updateData.preliminaryCause = data.preliminaryCause;
    if (data.containmentAction !== undefined) updateData.containmentAction = data.containmentAction;
    if (data.disposition !== undefined) updateData.disposition = data.disposition;
    if (data.dispositionReason !== undefined) updateData.dispositionReason = data.dispositionReason;
    if (data.reworkInstructions !== undefined) updateData.reworkInstructions = data.reworkInstructions;
    if (data.closureNotes !== undefined) updateData.closureNotes = data.closureNotes;

    const ncr = await prisma.nCR.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(ncr);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PATCH /api/quality/ncr/[id]' });
    return NextResponse.json({ error: "Lỗi cập nhật NCR" }, { status: 500 });
  }
}
