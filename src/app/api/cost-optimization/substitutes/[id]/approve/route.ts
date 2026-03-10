import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import prisma from "@/lib/prisma";
import { checkWriteEndpointLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const POST = withAuth(async (request, context, session) => {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;

    const evaluation = await prisma.substituteEvaluation.findUnique({
      where: { id },
    });

    if (!evaluation) {
      return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
    }

    if (evaluation.status !== "SUB_TESTING" && evaluation.status !== "EVALUATING") {
      return NextResponse.json(
        { error: "Evaluation must be in EVALUATING or SUB_TESTING status to approve" },
        { status: 400 }
      );
    }

    const updated = await prisma.substituteEvaluation.update({
      where: { id },
      data: {
        status: "SUB_APPROVED",
        approvedById: session.user.id,
        approvedAt: new Date(),
      },
      include: {
        originalPart: { select: { id: true, partNumber: true, name: true } },
        substitutePart: { select: { id: true, partNumber: true, name: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "POST /api/cost-optimization/substitutes/[id]/approve" }
    );
    return NextResponse.json({ error: "Failed to approve" }, { status: 500 });
  }
});
