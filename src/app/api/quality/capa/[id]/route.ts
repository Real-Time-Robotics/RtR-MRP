import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { transitionCAPA } from "@/lib/quality/capa-workflow";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      return NextResponse.json({ error: "CAPA not found" }, { status: 404 });
    }

    return NextResponse.json(capa);
  } catch (error) {
    console.error("Failed to fetch CAPA:", error);
    return NextResponse.json({ error: "Failed to fetch CAPA" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // If action is provided, use the workflow transition
    if (body.action) {
      const result = await transitionCAPA(id, body.action, session.user.id, body);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      const updatedCAPA = await prisma.cAPA.findUnique({ where: { id } });
      return NextResponse.json(updatedCAPA);
    }

    // Otherwise, do a regular update
    const capa = await prisma.cAPA.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        priority: body.priority,
        rcaMethod: body.rcaMethod,
        rcaFindings: body.rcaFindings,
        rootCause: body.rootCause,
        immediateAction: body.immediateAction,
        verificationMethod: body.verificationMethod,
        verificationResults: body.verificationResults,
        effectivenessScore: body.effectivenessScore,
        closureNotes: body.closureNotes,
        targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
      },
    });

    return NextResponse.json(capa);
  } catch (error) {
    console.error("Failed to update CAPA:", error);
    return NextResponse.json({ error: "Failed to update CAPA" }, { status: 500 });
  }
}
