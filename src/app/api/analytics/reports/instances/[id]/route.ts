import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const startTime = Date.now();
  const { id } = await context.params;

  try {
    const instance = await prisma.reportInstance.findUnique({
      where: { id },
    });

    if (!instance) {
      return NextResponse.json(
        { success: false, error: 'Report instance not found' },
        { status: 404 }
      );
    }

    if (instance.status !== 'completed' || !instance.fileUrl) {
      return NextResponse.json(
        { success: false, error: 'Report not ready for download' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: instance.id,
        fileUrl: instance.fileUrl,
        format: instance.format,
        fileSize: instance.fileSize,
        generatedAt: instance.generatedAt,
      },
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/analytics/reports/instances/[id]' });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch report instance' },
      { status: 500 }
    );
  }
}
