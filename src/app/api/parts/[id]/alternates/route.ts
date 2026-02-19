import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { logger } from "@/lib/logger";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

const alternateBodySchema = z.object({
  alternatePartId: z.string(),
  alternateType: z.enum(["FORM_FIT_FUNCTION", "FUNCTIONAL", "EMERGENCY", "APPROVED_VENDOR"]).optional(),
  priority: z.number().optional(),
  conversionFactor: z.number().optional(),
  approved: z.boolean().optional(),
  effectiveDate: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
});

// GET - List alternates for a part
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;

    const alternates = await prisma.partAlternate.findMany({
      where: { partId: id },
      include: {
        alternatePart: true,
      },
      orderBy: { priority: "asc" },
    });

    return NextResponse.json(alternates);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/parts/[id]/alternates' });
    return NextResponse.json(
      { error: "Failed to fetch alternates" },
      { status: 500 }
    );
  }
});

// POST - Add alternate part
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;
    const rawBody = await request.json();
    const parseResult = alternateBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = parseResult.data;

    // Validate alternate part exists
    const alternatePart = await prisma.part.findUnique({
      where: { id: data.alternatePartId },
    });

    if (!alternatePart) {
      return NextResponse.json(
        { error: "Alternate part not found" },
        { status: 404 }
      );
    }

    // Check for existing relationship
    const existing = await prisma.partAlternate.findFirst({
      where: {
        partId: id,
        alternatePartId: data.alternatePartId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Alternate relationship already exists" },
        { status: 409 }
      );
    }

    const alternate = await prisma.partAlternate.create({
      data: {
        id: `ALT-${Date.now()}`,
        partId: id,
        alternatePartId: data.alternatePartId,
        alternateType: data.alternateType || "FORM_FIT_FUNCTION",
        priority: data.priority || 1,
        conversionFactor: data.conversionFactor || 1,
        approved: data.approved ?? true,
        approvedBy: data.approved ? session.user?.email : null,
        approvalDate: data.approved ? new Date() : null,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        notes: data.notes,
      },
      include: {
        alternatePart: true,
      },
    });

    return NextResponse.json(alternate, { status: 201 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/parts/[id]/alternates' });
    return NextResponse.json(
      { error: "Failed to create alternate" },
      { status: 500 }
    );
  }
});
