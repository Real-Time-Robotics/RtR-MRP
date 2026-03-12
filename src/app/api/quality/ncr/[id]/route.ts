import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { transitionNCR } from "@/lib/quality/ncr-workflow";
import { z } from "zod";
import { logger } from "@/lib/logger";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
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

export const GET = withAuth(async (request, context, _session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;

    const ncr = await prisma.nCR.findUnique({
      where: { id },
      include: {
        part: { select: { id: true, partNumber: true, name: true } },
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
});

export const PATCH = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;

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
      // Strip non-model fields before passing to transitionNCR
      const { action: _action, ...transitionData } = body;
      const result = await transitionNCR(id, data.action, session.user.id, transitionData);
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
});
