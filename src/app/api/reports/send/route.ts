// src/app/api/reports/send/route.ts
// Send report via email with PDF/Excel attachment

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/with-auth';
import { generateReportData } from '@/lib/reports/report-generator';
import { renderToPDF } from '@/lib/reports/pdf-renderer';
import { renderToExcel } from '@/lib/reports/excel-renderer';
import { sendReportEmail } from '@/lib/reports/email-sender';
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
    recipients: z.array(z.string()),
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
  const { templateId, format, recipients, filters } = body;

  if (!templateId || !recipients?.length) {
    return NextResponse.json({ error: 'Missing templateId or recipients' }, { status: 400 });
  }

  try {
    const data = await generateReportData(templateId, filters);

    const timestamp = new Date().toISOString().slice(0, 10);
    const safeName = data.template.nameVi.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF ]/g, '').trim();

    const attachments: { filename: string; content: Buffer; contentType: string }[] = [];

    if (format === 'PDF' || format === 'BOTH') {
      const pdfBuffer = await renderToPDF(data);
      attachments.push({
        filename: `${safeName}-${timestamp}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      });
    }

    if (format === 'EXCEL' || format === 'BOTH') {
      const excelBuffer = renderToExcel(data);
      attachments.push({
        filename: `${safeName}-${timestamp}.xlsx`,
        content: excelBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    }

    // Build summary text
    const summaryHtml = data.summary.highlights
      .map((h) => `<strong>${h.label}:</strong> ${h.value}`)
      .join('<br>');

    const result = await sendReportEmail({
      to: recipients,
      reportName: data.template.name,
      reportNameVi: data.template.nameVi,
      summary: summaryHtml,
      attachments,
    });

    // Log to history
    await prisma.reportHistory.create({
      data: {
        templateId,
        format,
        fileSize: attachments.reduce((sum, a) => sum + a.content.length, 0),
        recipients: recipients as string[],
        status: result.success ? 'SENT' : 'FAILED',
        error: result.error,
        sentAt: result.success ? new Date() : undefined,
        generatedBy: session.user?.id || 'system',
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { error: `Email failed: ${result.error}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    logger.error('Report send failed:', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to send report' },
      { status: 500 }
    );
  }
});
