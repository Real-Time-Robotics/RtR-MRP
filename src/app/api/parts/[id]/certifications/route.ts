import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { logger } from "@/lib/logger";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

const certificationBodySchema = z.object({
  certificationType: z.enum(["ROHS", "REACH", "CE", "UL", "ISO", "AS9100", "ITAR", "NDAA", "COC", "COA", "OTHER"]),
  certificateNumber: z.string().optional(),
  issuingBody: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  documentUrl: z.string().optional(),
  verified: z.boolean().optional(),
  notes: z.string().optional(),
});

// GET - List certifications for a part
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;

    const certifications = await prisma.partCertification.findMany({
      where: { partId: id },
      orderBy: { expiryDate: "asc" },
    });

    return NextResponse.json(certifications);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/parts/[id]/certifications' });
    return NextResponse.json(
      { error: "Failed to fetch certifications" },
      { status: 500 }
    );
  }
});

// POST - Add certification to part
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;
    const rawBody = await request.json();
    const parseResult = certificationBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = parseResult.data;

    const certification = await prisma.partCertification.create({
      data: {
        id: `CERT-${Date.now()}`,
        partId: id,
        certificationType: data.certificationType,
        certificateNumber: data.certificateNumber,
        issuingBody: data.issuingBody,
        issueDate: data.issueDate ? new Date(data.issueDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        documentUrl: data.documentUrl,
        verified: data.verified ?? false,
        verifiedBy: data.verified ? session.user?.email : null,
        verifiedDate: data.verified ? new Date() : null,
        notes: data.notes,
      },
    });

    return NextResponse.json(certification, { status: 201 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/parts/[id]/certifications' });
    return NextResponse.json(
      { error: "Failed to create certification" },
      { status: 500 }
    );
  }
});
