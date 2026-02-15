// src/app/api/reports/generate/route.ts
// Generate report as PDF or Excel file download

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateReportData } from '@/lib/reports/report-generator';
import { renderToPDF } from '@/lib/reports/pdf-renderer';
import { renderToExcel } from '@/lib/reports/excel-renderer';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { templateId, format = 'EXCEL', filters } = body;

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
        generatedBy: session.user.id,
      },
    });

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    console.error('Report generation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
