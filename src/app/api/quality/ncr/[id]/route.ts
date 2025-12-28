import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { transitionNCR } from "@/lib/quality/ncr-workflow";

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
    console.error("Failed to fetch NCR:", error);
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // If action is provided, use the workflow transition
    if (body.action) {
      const result = await transitionNCR(id, body.action, session.user.id, body);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      const updatedNCR = await prisma.nCR.findUnique({ where: { id } });
      return NextResponse.json(updatedNCR);
    }

    // Otherwise, do a regular update
    const ncr = await prisma.nCR.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        priority: body.priority,
        defectCode: body.defectCode,
        defectCategory: body.defectCategory,
        preliminaryCause: body.preliminaryCause,
        containmentAction: body.containmentAction,
        disposition: body.disposition,
        dispositionReason: body.dispositionReason,
        reworkInstructions: body.reworkInstructions,
        closureNotes: body.closureNotes,
      },
    });

    return NextResponse.json(ncr);
  } catch (error) {
    console.error("Failed to update NCR:", error);
    return NextResponse.json({ error: "Failed to update NCR" }, { status: 500 });
  }
}
