// src/app/api/reports/history/route.ts
// Report generation/send history

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

import { checkReadEndpointLimit } from '@/lib/rate-limit';
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status');
    const templateId = searchParams.get('templateId');

    const where: Record<string, unknown> = {
      generatedBy: session.user?.id,
    };
    if (status) where.status = status;
    if (templateId) where.templateId = templateId;

    const [history, total] = await Promise.all([
      prisma.reportHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.reportHistory.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: history,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/reports/history' });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch report history' },
      { status: 500 }
    );
  }
});
