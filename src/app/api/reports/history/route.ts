// src/app/api/reports/history/route.ts
// Report generation/send history

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const status = searchParams.get('status');
  const templateId = searchParams.get('templateId');

  const where: Record<string, unknown> = {
    generatedBy: session.user.id,
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
}
