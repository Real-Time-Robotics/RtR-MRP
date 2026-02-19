// src/app/api/reports/generate/route.ts
// Generate report as PDF or Excel file download

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/with-auth';
import { generateReportData } from '@/lib/reports/report-generator';
import { renderToPDF } from '@/lib/reports/pdf-renderer';
import { renderToExcel } from '@/lib/reports/excel-renderer';
import prisma from '@/lib/prisma';

import { checkWriteEndpointLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const bodySchema = z.object({
    templateId: z.string(),
    format: z.string().default('EXCEL'),
    filters: z.record(z.string(), z.unknown()).optional(),
  });

  const rawBody = await request.json();
  const parseResult = bodySchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const body = parseResult.data;
  const { templateId, format, filters } = body;

  if (!templateId) {
    return NextResponse.json({ error: 'Missing templateId' }, { status: 400 });
  }

  try {
    const data = await generateReportData(templateId, filters);

    let fileBuffer: Buffer;
    let filename: string;
    let contentType: string;

    const timestamp = new Date().toISOString().slice(0, 10);
    const safeName = data.template.nameVi.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF ]/g, '').trim();

    if (format === 'PDF') {
      fileBuffer = await renderToPDF(data);
      filename = `${safeName}-${timestamp}.pdf`;
      contentType = 'application/pdf';
    } else {
      fileBuffer = renderToExcel(data);
      filename = `${safeName}-${timestamp}.xlsx`;
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    // Log to history
    await prisma.reportHistory.create({
      data: {
        templateId,
        format,
        fileSize: fileBuffer.length,
        status: 'GENERATED',
        generatedBy: session.user?.id || 'system',
      },
    });

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    logger.error('Report generation failed:', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
});
