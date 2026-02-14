import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get revision history for a part
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

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
}

// POST - Create new revision entry (usually done via ECR/ECO workflow)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

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
}
