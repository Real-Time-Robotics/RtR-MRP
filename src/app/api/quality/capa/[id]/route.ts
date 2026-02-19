import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { transitionCAPA } from "@/lib/quality/capa-workflow";
import { z } from "zod";
import { logger } from "@/lib/logger";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// Validation schema for CAPA update
const CAPAUpdateSchema = z.object({
  action: z.string().optional(), // Workflow transition action
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  rcaMethod: z.string().optional().nullable(),
  rcaFindings: z.string().optional().nullable(),
  rootCause: z.string().optional().nullable(),
  immediateAction: z.string().optional().nullable(),
  verificationMethod: z.string().optional().nullable(),
  verificationResults: z.string().optional().nullable(),
  effectivenessScore: z.number().min(0).max(100).optional().nullable(),
  closureNotes: z.string().optional().nullable(),
  targetDate: z.string().optional(),
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

    const capa = await prisma.cAPA.findUnique({
      where: { id },
      include: {
        ncrs: {
          select: { ncrNumber: true, title: true, status: true },
        },
        actions: {
          orderBy: { sequence: "asc" },
        },
        history: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!capa) {
      return NextResponse.json({ error: "CAPA không tồn tại" }, { status: 404 });
    }

    return NextResponse.json(capa);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/quality/capa/[id]' });
    return NextResponse.json({ error: "Lỗi tải CAPA" }, { status: 500 });
  }
}

export const PATCH = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;

    // Check if CAPA exists
    const existing = await prisma.cAPA.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "CAPA không tồn tại" }, { status: 404 });
    }

    const body = await request.json();

    // Validate request body
    const validationResult = CAPAUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // If action is provided, use the workflow transition
    if (data.action) {
      const result = await transitionCAPA(id, data.action, session.user.id, body);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      const updatedCAPA = await prisma.cAPA.findUnique({ where: { id } });
      return NextResponse.json(updatedCAPA);
    }

    // Otherwise, do a regular update (only update provided fields)
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.rcaMethod !== undefined) updateData.rcaMethod = data.rcaMethod;
    if (data.rcaFindings !== undefined) updateData.rcaFindings = data.rcaFindings;
    if (data.rootCause !== undefined) updateData.rootCause = data.rootCause;
    if (data.immediateAction !== undefined) updateData.immediateAction = data.immediateAction;
    if (data.verificationMethod !== undefined) updateData.verificationMethod = data.verificationMethod;
    if (data.verificationResults !== undefined) updateData.verificationResults = data.verificationResults;
    if (data.effectivenessScore !== undefined) updateData.effectivenessScore = data.effectivenessScore;
    if (data.closureNotes !== undefined) updateData.closureNotes = data.closureNotes;
    if (data.targetDate !== undefined) updateData.targetDate = new Date(data.targetDate);

    const capa = await prisma.cAPA.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(capa);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PATCH /api/quality/capa/[id]' });
    return NextResponse.json({ error: "Lỗi cập nhật CAPA" }, { status: 500 });
  }
});
