// src/app/api/production/schedule/route.ts
// GET Gantt schedule data for production work orders

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { getGanttData } from '@/lib/production/gantt-data';

import { checkReadEndpointLimit } from '@/lib/rate-limit';
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const status = searchParams.get('status')?.split(',').filter(Boolean);

  try {
    const data = await getGanttData(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      status
    );

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to load schedule',
      },
      { status: 500 }
    );
  }
});
