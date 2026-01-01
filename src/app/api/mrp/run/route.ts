// =============================================================================
// MRP RUN API ROUTE
// POST /api/mrp/run - Execute MRP calculation
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';

// =============================================================================
// TYPES
// =============================================================================

interface MRPRunRequest {
  orderIds: string[];
  options?: {
    includeSafetyStock?: boolean;
    planningHorizon?: number;
  };
}

// =============================================================================
// POST /api/mrp/run
// Execute MRP calculation for selected orders
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: MRPRunRequest = await request.json();
    const { orderIds, options } = body;

    if (!orderIds || orderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No orders selected for MRP' },
        { status: 400 }
      );
    }

    console.log(`[MRP API] Running MRP for orders: ${orderIds.join(', ')}`);

    // TODO: Replace with real Prisma queries and calculation
    // 
    // Step 1: Get sales orders with items
    // const orders = await prisma.salesOrder.findMany({
    //   where: { id: { in: orderIds } },
    //   include: { items: { include: { part: true } } },
    // });
    //
    // Step 2: Get BOM for each finished good
    // const bomItems = await prisma.bOMItem.findMany({
    //   where: { parentPartId: { in: finishedGoodIds } },
    //   include: { childPart: true },
    // });
    //
    // Step 3: Get current inventory
    // const inventory = await prisma.inventory.findMany({
    //   include: { part: true, supplier: true },
    // });
    //
    // Step 4: Calculate MRP
    // const result = calculateMRP(orders, bomItems, inventory, options);
    //
    // Step 5: Save MRP run history
    // await prisma.mRPRun.create({ data: { ... } });

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock calculation result
    const mockResult = {
      runId: `MRP_${Date.now()}`,
      runDate: new Date().toISOString(),
      salesOrders: orderIds,
      status: 'Completed',
      summary: {
        totalRequirements: 6,
        criticalItems: 2,
        lowItems: 2,
        okItems: 2,
        totalPurchaseValue: 16980000,
      },
      requirements: [
        {
          partId: 'p1',
          partNumber: 'CMP-BRG-002',
          partName: 'Bạc đạn bi 6201-2RS',
          category: 'Components',
          unit: 'pcs',
          grossRequirement: 60,
          onHand: 25,
          onOrder: 0,
          safetyStock: 30,
          netRequirement: 65,
          status: 'CRITICAL',
          supplierName: 'SKF Vietnam',
          leadTime: 7,
          unitCost: 42000,
          totalCost: 2730000,
        },
        {
          partId: 'p2',
          partNumber: 'CMP-MOT-001',
          partName: 'Motor DC 12V 50W',
          category: 'Components',
          unit: 'pcs',
          grossRequirement: 40,
          onHand: 15,
          onOrder: 10,
          safetyStock: 10,
          netRequirement: 25,
          status: 'CRITICAL',
          supplierName: 'Oriental Motor VN',
          leadTime: 14,
          unitCost: 250000,
          totalCost: 6250000,
        },
        {
          partId: 'p3',
          partNumber: 'RM-STL-002',
          partName: 'Thép tấm carbon 3mm',
          category: 'Raw Materials',
          unit: 'kg',
          grossRequirement: 180,
          onHand: 120,
          onOrder: 0,
          safetyStock: 40,
          netRequirement: 100,
          status: 'LOW',
          supplierName: 'Thép Việt Nam Steel',
          leadTime: 7,
          unitCost: 26000,
          totalCost: 2600000,
        },
        {
          partId: 'p4',
          partNumber: 'CMP-GBX-001',
          partName: 'Hộp số giảm tốc 1:10',
          category: 'Components',
          unit: 'pcs',
          grossRequirement: 30,
          onHand: 18,
          onOrder: 5,
          safetyStock: 5,
          netRequirement: 12,
          status: 'LOW',
          supplierName: 'Oriental Motor VN',
          leadTime: 21,
          unitCost: 450000,
          totalCost: 5400000,
        },
        {
          partId: 'p5',
          partNumber: 'CMP-SCR-001',
          partName: 'Vít lục giác M4x10 inox',
          category: 'Components',
          unit: 'pcs',
          grossRequirement: 800,
          onHand: 2500,
          onOrder: 0,
          safetyStock: 500,
          netRequirement: 0,
          status: 'OK',
          supplierName: 'Ốc vít Tân Tiến',
          leadTime: 3,
          unitCost: 500,
          totalCost: 0,
        },
        {
          partId: 'p6',
          partNumber: 'RM-ALU-001',
          partName: 'Nhôm tấm 1.5mm',
          category: 'Raw Materials',
          unit: 'kg',
          grossRequirement: 75,
          onHand: 85,
          onOrder: 50,
          safetyStock: 30,
          netRequirement: 0,
          status: 'OK',
          supplierName: 'Nhôm Đông Á',
          leadTime: 10,
          unitCost: 85000,
          totalCost: 0,
        },
      ],
      suggestions: [
        {
          id: 'sug_p2',
          partNumber: 'CMP-MOT-001',
          partName: 'Motor DC 12V 50W',
          supplierName: 'Oriental Motor VN',
          quantity: 25,
          unit: 'pcs',
          unitCost: 250000,
          totalCost: 6250000,
          orderDate: '2024-12-27',
          requiredDate: '2025-01-10',
          priority: 'URGENT',
          leadTime: 14,
        },
        {
          id: 'sug_p1',
          partNumber: 'CMP-BRG-002',
          partName: 'Bạc đạn bi 6201-2RS',
          supplierName: 'SKF Vietnam',
          quantity: 65,
          unit: 'pcs',
          unitCost: 42000,
          totalCost: 2730000,
          orderDate: '2025-01-03',
          requiredDate: '2025-01-10',
          priority: 'URGENT',
          leadTime: 7,
        },
        {
          id: 'sug_p4',
          partNumber: 'CMP-GBX-001',
          partName: 'Hộp số giảm tốc 1:10',
          supplierName: 'Oriental Motor VN',
          quantity: 12,
          unit: 'pcs',
          unitCost: 450000,
          totalCost: 5400000,
          orderDate: '2024-12-22',
          requiredDate: '2025-01-12',
          priority: 'HIGH',
          leadTime: 21,
        },
        {
          id: 'sug_p3',
          partNumber: 'RM-STL-002',
          partName: 'Thép tấm carbon 3mm',
          supplierName: 'Thép Việt Nam Steel',
          quantity: 100,
          unit: 'kg',
          unitCost: 26000,
          totalCost: 2600000,
          orderDate: '2025-01-05',
          requiredDate: '2025-01-12',
          priority: 'NORMAL',
          leadTime: 7,
        },
      ],
    };

    console.log(`[MRP API] MRP run completed: ${mockResult.runId}`);

    return NextResponse.json({ success: true, data: mockResult });
  } catch (error) {
    console.error('[MRP API] Error running MRP:', error);
    return NextResponse.json(
      { success: false, error: 'MRP calculation failed' },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET /api/mrp/run
// Get MRP run history
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // TODO: Replace with Prisma query
    // const runs = await prisma.mRPRun.findMany({
    //   take: limit,
    //   orderBy: { runDate: 'desc' },
    //   include: { createdBy: true },
    // });

    const mockRuns = [
      {
        runId: 'MRP_1704067200000',
        runDate: '2025-01-01T10:00:00Z',
        salesOrders: ['SO-2025-001', 'SO-2025-002'],
        status: 'Completed',
        totalRequirements: 6,
        criticalItems: 2,
        totalPurchaseValue: 16980000,
        createdBy: 'Admin User',
      },
    ];

    return NextResponse.json({ success: true, data: mockRuns });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch MRP history' },
      { status: 500 }
    );
  }
}
