import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// =============================================================================
// GET - List all warehouses
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const warehouses = await prisma.warehouse.findMany({
      orderBy: { code: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: warehouses,
    });
  } catch (error) {
    console.error('Failed to fetch warehouses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch warehouses' },
      { status: 500 }
    );
  }
}
