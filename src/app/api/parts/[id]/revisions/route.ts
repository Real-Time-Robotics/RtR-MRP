import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { logger } from "@/lib/logger";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

const revisionBodySchema = z.object({
  revision: z.string(),
  changeType: z.string().optional(),
  changeReason: z.string().optional(),
  changeDescription: z.string().optional(),
  ecrNumber: z.string().optional(),
  ecoNumber: z.string().optional(),
  approvedBy: z.string().optional(),
  approvalDate: z.string().optional(),
  updatePartRevision: z.boolean().optional(),
});

// GET - Get revision history for a part
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;

    const revisions = await prisma.partRevision.findMany({
      where: { partId: id },
      orderBy: { revisionDate: "desc" },
    });

    return NextResponse.json(revisions);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/parts/[id]/revisions' });
    return NextResponse.json(
      { error: "Failed to fetch revisions" },
      { status: 500 }
    );
  }
});

// POST - Create new revision entry (usually done via ECR/ECO workflow)
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;
    const rawBody = await request.json();
    const parseResult = revisionBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = parseResult.data;

    // Get current part revision
    const part = await prisma.part.findUnique({
      where: { id },
      select: { revision: true },
    });

    if (!part) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    const revision = await prisma.partRevision.create({
      data: {
        id: `REV-${Date.now()}`,
        partId: id,
        revision: data.revision,
        previousRevision: part.revision,
        revisionDate: new Date(),
        changeType: data.changeType,
        changeReason: data.changeReason,
        changeDescription: data.changeDescription,
        ecrNumber: data.ecrNumber,
        ecoNumber: data.ecoNumber,
        changedBy: session.user?.email || "system",
        approvedBy: data.approvedBy,
        approvalDate: data.approvalDate ? new Date(data.approvalDate) : null,
      },
    });

    // Update part's current revision if specified
    if (data.updatePartRevision) {
      await prisma.part.update({
        where: { id },
        data: {
          revision: data.revision,
          updatedBy: session.user?.email || "system",
        },
      });
    }

    return NextResponse.json(revision, { status: 201 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/parts/[id]/revisions' });
    return NextResponse.json(
      { error: "Failed to create revision" },
      { status: 500 }
    );
  }
});
