import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import prisma from "@/lib/prisma";
import { checkReadEndpointLimit, checkWriteEndpointLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const GET = withAuth(async (request, context, _session) => {
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;

    const evaluation = await prisma.substituteEvaluation.findUnique({
      where: { id },
      include: {
        originalPart: {
          select: {
            id: true, partNumber: true, name: true, category: true,
            unitCost: true, ndaaCompliant: true, leadTimeDays: true,
          },
        },
        substitutePart: {
          select: {
            id: true, partNumber: true, name: true, category: true,
            unitCost: true, ndaaCompliant: true, leadTimeDays: true,
          },
        },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!evaluation) {
      return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
    }

    return NextResponse.json(evaluation);
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "GET /api/cost-optimization/substitutes/[id]" }
    );
    return NextResponse.json({ error: "Failed to fetch evaluation" }, { status: 500 });
  }
});

export const PUT = withAuth(async (request, context, _session) => {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;
    const body = await request.json();

    const existing = await prisma.substituteEvaluation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
    }

    const updated = await prisma.substituteEvaluation.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.testStatus && { testStatus: body.testStatus }),
        ...(body.testResults !== undefined && { testResults: body.testResults }),
        ...(body.testDate && { testDate: new Date(body.testDate) }),
        ...(body.sampleOrdered !== undefined && { sampleOrdered: body.sampleOrdered }),
        ...(body.sampleOrderDate && { sampleOrderDate: new Date(body.sampleOrderDate) }),
        ...(body.compatibilityScore !== undefined && { compatibilityScore: body.compatibilityScore }),
        ...(body.specsComparisonJson && { specsComparisonJson: body.specsComparisonJson }),
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
      { context: "PUT /api/cost-optimization/substitutes/[id]" }
    );
    return NextResponse.json({ error: "Failed to update evaluation" }, { status: 500 });
  }
});

export const DELETE = withAuth(async (request, context, _session) => {
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;
    await prisma.substituteEvaluation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "DELETE /api/cost-optimization/substitutes/[id]" }
    );
    return NextResponse.json({ error: "Failed to delete evaluation" }, { status: 500 });
  }
});
