import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { logger } from "@/lib/logger";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

const documentBodySchema = z.object({
  documentType: z.enum(["DRAWING", "DATASHEET", "SPECIFICATION", "CERTIFICATE", "TEST_REPORT", "MSDS", "MANUAL", "OTHER"]),
  documentNumber: z.string().optional(),
  title: z.string(),
  revision: z.string().optional(),
  url: z.string(),
  effectiveDate: z.string().optional(),
  expiryDate: z.string().optional(),
});

// GET - List documents for a part
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;

    const documents = await prisma.partDocument.findMany({
      where: { partId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/parts/[id]/documents' });
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
});

// POST - Add document to part
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { id } = await context.params;
    const rawBody = await request.json();
    const parseResult = documentBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = parseResult.data;

    const document = await prisma.partDocument.create({
      data: {
        id: `DOC-${Date.now()}`,
        partId: id,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        title: data.title,
        revision: data.revision || "A",
        url: data.url,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        uploadedBy: session.user?.email || "system",
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/parts/[id]/documents' });
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
});
