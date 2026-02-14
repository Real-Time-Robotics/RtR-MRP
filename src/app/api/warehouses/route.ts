import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { WAREHOUSE_FLOW_ORDER } from '@/types';

// =============================================================================
// GET - List all warehouses (sorted by material flow)
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const warehouses = await prisma.warehouse.findMany();

    // Sort by material flow order (Receiving → Quarantine → Main → WIP → FG → Shipping → Hold → Scrap)
    const sorted = warehouses.sort((a, b) => {
      const orderA = WAREHOUSE_FLOW_ORDER[a.type || 'MAIN'] ?? 99;
      const orderB = WAREHOUSE_FLOW_ORDER[b.type || 'MAIN'] ?? 99;
      return orderA - orderB;
    });

    return NextResponse.json({
      success: true,
      data: sorted,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/warehouses' });
    return NextResponse.json(
      { error: 'Failed to fetch warehouses' },
      { status: 500 }
    );
  }
}
