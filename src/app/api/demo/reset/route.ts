import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { checkWriteEndpointLimit, checkReadEndpointLimit } from '@/lib/rate-limit';

// =============================================================================
// DEMO RESET API
// Resets all demo data to initial state
// Only accessible by demo admin users
// GATED: Only available when NEXT_PUBLIC_DEMO_MODE=true or NODE_ENV !== 'production'
// =============================================================================

const isDemoEnabled = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.NODE_ENV !== 'production';

export const POST = withAuth(async (request, context, session) => {
  // Environment gate check
  if (!isDemoEnabled) {
    return NextResponse.json(
      { success: false, error: 'Demo endpoints are disabled in production.' },
      { status: 403 }
    );
  }

  // Rate limiting
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    // Check authentication
// Check if user is demo admin
    const userEmail = session.user.email || '';
    const userRole = session.user.role;

    const isDemo = userEmail.includes('@demo.rtr-mrp.com');
    const isAdmin = userRole === 'admin';

    if (!isDemo || !isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Only demo admin can reset data' },
        { status: 403 }
      );
    }

    // Reset demo data - delete recent records (last 7 days) to simulate reset
    // Note: WorkOrder, SalesOrder, PurchaseOrder don't have createdById field
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await prisma.$transaction(async (tx) => {
      // Delete recent work orders (MaterialAllocations will cascade)
      await tx.workOrder.deleteMany({
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
      });

      // Delete recent sales orders (SalesOrderLines will cascade due to onDelete: Cascade)
      await tx.salesOrder.deleteMany({
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
      });

      // Delete recent purchase orders (PurchaseOrderLines will cascade due to onDelete: Cascade)
      await tx.purchaseOrder.deleteMany({
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Demo data has been reset successfully',
      timestamp: new Date().toISOString(),
      resetBy: userEmail,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/demo/reset' });

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to reset demo data',
        error: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
});

// GET endpoint to check demo status
export const GET = withAuth(async (request, context, session) => {
  // Rate limiting
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
const userEmail = session.user.email || '';
    const isDemo = userEmail.includes('@demo.rtr-mrp.com');

    if (!isDemo) {
      return NextResponse.json(
        { success: false, message: 'Not a demo user' },
        { status: 403 }
      );
    }

    // Get current data counts
    const [workOrders, salesOrders, purchaseOrders] = await Promise.all([
      prisma.workOrder.count(),
      prisma.salesOrder.count(),
      prisma.purchaseOrder.count(),
    ]);

    return NextResponse.json({
      success: true,
      isDemo: true,
      stats: {
        workOrders,
        salesOrders,
        purchaseOrders,
        total: workOrders + salesOrders + purchaseOrders,
      },
      message: 'Demo data statistics retrieved',
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/demo/reset' });

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to get demo stats',
      },
      { status: 500 }
    );
  }
});
