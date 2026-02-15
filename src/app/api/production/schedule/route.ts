// src/app/api/production/schedule/route.ts
// GET Gantt schedule data for production work orders

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getGanttData } from '@/lib/production/gantt-data';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
        error:
          error instanceof Error ? error.message : 'Failed to load schedule',
      },
      { status: 500 }
    );
  }
}
