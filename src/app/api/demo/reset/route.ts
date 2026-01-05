import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// =============================================================================
// DEMO RESET API
// Resets all demo data to initial state
// Only accessible by demo admin users
// =============================================================================

export async function POST() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is demo admin
    const userEmail = session.user.email || '';
    const userRole = (session.user as { role?: string }).role;

    const isDemo = userEmail.includes('@demo.rtr-mrp.com');
    const isAdmin = userRole === 'admin';

    if (!isDemo || !isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Only demo admin can reset data' },
        { status: 403 }
      );
    }

    // Get demo user IDs to preserve
    const demoUsers = await prisma.user.findMany({
      where: {
        email: {
          contains: '@demo.rtr-mrp.com',
        },
      },
      select: { id: true },
    });

    const demoUserIds = demoUsers.map((u) => u.id);

    // Reset demo data in order (respecting foreign key constraints)
    await prisma.$transaction(async (tx) => {
      // Delete work order materials and items first
      await tx.workOrderMaterial.deleteMany({
        where: {
          workOrder: {
            createdById: { in: demoUserIds },
          },
        },
      });

      // Delete work orders
      await tx.workOrder.deleteMany({
        where: {
          createdById: { in: demoUserIds },
        },
      });

      // Delete sales order items
      await tx.salesOrderItem.deleteMany({
        where: {
          salesOrder: {
            createdById: { in: demoUserIds },
          },
        },
      });

      // Delete sales orders
      await tx.salesOrder.deleteMany({
        where: {
          createdById: { in: demoUserIds },
        },
      });

      // Delete purchase order items
      await tx.purchaseOrderItem.deleteMany({
        where: {
          purchaseOrder: {
            createdById: { in: demoUserIds },
          },
        },
      });

      // Delete purchase orders
      await tx.purchaseOrder.deleteMany({
        where: {
          createdById: { in: demoUserIds },
        },
      });

      // Delete inventory transactions
      await tx.inventoryTransaction.deleteMany({
        where: {
          createdById: { in: demoUserIds },
        },
      });

      // Note: We don't delete master data (Parts, Suppliers, Customers, Warehouses)
      // as these are shared and seeded initially
    });

    // Log the reset action
    console.log(`[Demo Reset] Data reset by ${userEmail} at ${new Date().toISOString()}`);

    return NextResponse.json({
      success: true,
      message: 'Demo data has been reset successfully',
      timestamp: new Date().toISOString(),
      resetBy: userEmail,
    });
  } catch (error) {
    console.error('[Demo Reset Error]:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to reset demo data',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check reset status
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email || '';
    const isDemo = userEmail.includes('@demo.rtr-mrp.com');

    if (!isDemo) {
      return NextResponse.json(
        { success: false, message: 'Not a demo user' },
        { status: 403 }
      );
    }

    // Get current demo data counts
    const demoUsers = await prisma.user.findMany({
      where: {
        email: {
          contains: '@demo.rtr-mrp.com',
        },
      },
      select: { id: true },
    });

    const demoUserIds = demoUsers.map((u) => u.id);

    const [workOrders, salesOrders, purchaseOrders, inventoryTransactions] =
      await Promise.all([
        prisma.workOrder.count({
          where: { createdById: { in: demoUserIds } },
        }),
        prisma.salesOrder.count({
          where: { createdById: { in: demoUserIds } },
        }),
        prisma.purchaseOrder.count({
          where: { createdById: { in: demoUserIds } },
        }),
        prisma.inventoryTransaction.count({
          where: { createdById: { in: demoUserIds } },
        }),
      ]);

    return NextResponse.json({
      success: true,
      isDemo: true,
      stats: {
        workOrders,
        salesOrders,
        purchaseOrders,
        inventoryTransactions,
        total: workOrders + salesOrders + purchaseOrders + inventoryTransactions,
      },
      message: 'Demo data statistics retrieved',
    });
  } catch (error) {
    console.error('[Demo Stats Error]:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to get demo stats',
      },
      { status: 500 }
    );
  }
}
