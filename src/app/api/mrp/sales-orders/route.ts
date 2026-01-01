// =============================================================================
// MRP API ROUTES
// API endpoints for MRP operations
// TODO: Connect to Prisma database for production
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';

// =============================================================================
// TYPES
// =============================================================================

interface MRPRequest {
  orderIds: string[];
  options?: {
    includeSafetyStock: boolean;
    planningHorizon: number; // days
  };
}

interface MRPResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// =============================================================================
// GET /api/mrp/sales-orders
// Get sales orders available for MRP planning
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse<MRPResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    // TODO: Replace with Prisma query
    // const orders = await prisma.salesOrder.findMany({
    //   where: {
    //     status: status ? { in: status.split(',') } : undefined,
    //     requiredDate: {
    //       gte: fromDate ? new Date(fromDate) : undefined,
    //       lte: toDate ? new Date(toDate) : undefined,
    //     },
    //   },
    //   include: {
    //     customer: true,
    //     items: {
    //       include: {
    //         part: true,
    //       },
    //     },
    //   },
    //   orderBy: { requiredDate: 'asc' },
    // });

    // Mock data for now
    const orders = [
      {
        id: '1',
        orderNumber: 'SO-2025-001',
        customer: { id: 'c1', name: 'ABC Manufacturing', code: 'ABC' },
        orderDate: '2025-01-02',
        requiredDate: '2025-01-15',
        status: 'Confirmed',
        totalValue: 150000000,
        items: [
          { id: 'i1', partId: 'fg1', partNumber: 'FG-PRD-A1', partName: 'Sản phẩm Model A1', quantity: 10, unitPrice: 15000000 },
        ],
      },
      {
        id: '2',
        orderNumber: 'SO-2025-002',
        customer: { id: 'c2', name: 'XYZ Industries', code: 'XYZ' },
        orderDate: '2025-01-02',
        requiredDate: '2025-01-20',
        status: 'Confirmed',
        totalValue: 92500000,
        items: [
          { id: 'i2', partId: 'fg2', partNumber: 'FG-PRD-A2', partName: 'Sản phẩm Model A2', quantity: 5, unitPrice: 18500000 },
        ],
      },
      {
        id: '3',
        orderNumber: 'SO-2025-003',
        customer: { id: 'c3', name: 'Đông Á Group', code: 'DAG' },
        orderDate: '2025-01-03',
        requiredDate: '2025-01-25',
        status: 'Pending',
        totalValue: 180000000,
        items: [
          { id: 'i3', partId: 'fg3', partNumber: 'FG-PRD-B1', partName: 'Sản phẩm Model B1', quantity: 15, unitPrice: 12000000 },
        ],
      },
    ];

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error('[MRP API] Error fetching orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales orders' },
      { status: 500 }
    );
  }
}
