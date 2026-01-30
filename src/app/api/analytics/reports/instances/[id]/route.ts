import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { reportService } from '@/lib/analytics';
import { prisma } from '@/lib/prisma';

// =============================================================================
// REPORT INSTANCE API - DOWNLOAD
// =============================================================================

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/analytics/reports/instances/[id] - Get instance or download
export async function GET(request: NextRequest, context: RouteContext) {
  const startTime = Date.now();
  const { id: instanceId } = await context.params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const download = searchParams.get('download') === 'true';

    // Get instance
    const instance = await reportService.getReportInstance(instanceId);

    if (!instance) {
      return NextResponse.json(
        { success: false, error: 'Report instance not found' },
        { status: 404 }
      );
    }

    // Check access through the report
    const report = await prisma.savedReport.findUnique({
      where: { id: instance.reportId },
    });

    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    if (!report.isPublic && report.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    if (download) {
      // Check if file is ready
      if (instance.status !== 'completed' || !instance.fileUrl) {
        return NextResponse.json(
          { success: false, error: 'Report not ready for download' },
          { status: 400 }
        );
      }

      // Check if expired
      if (instance.expiresAt && new Date(instance.expiresAt) < new Date()) {
        return NextResponse.json(
          { success: false, error: 'Report has expired' },
          { status: 410 }
        );
      }

      // Record download
      await reportService.recordDownload(instanceId);

      // TODO: In a real implementation, redirect to file storage URL
      // For now, return the file info
      return NextResponse.json({
        success: true,
        data: {
          downloadUrl: instance.fileUrl,
          fileName: instance.fileName,
          format: instance.format,
          fileSize: instance.fileSize,
        },
        timestamp: new Date().toISOString(),
        took: Date.now() - startTime,
      });
    }

    // Return instance info
    return NextResponse.json({
      success: true,
      data: instance,
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Error fetching report instance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch report instance' },
      { status: 500 }
    );
  }
}
