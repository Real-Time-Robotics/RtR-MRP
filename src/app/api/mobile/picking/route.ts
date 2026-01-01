// ═══════════════════════════════════════════════════════════════════
//                    MOBILE PICKING API
//              Sales order picking operations
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';

// Mock pick lists
const mockPickLists = [
  {
    id: 'pick1',
    pickNumber: 'PICK-2024-00001',
    soNumber: 'SO-2024-00001',
    customer: 'TechDrone Solutions',
    status: 'In Progress',
    priority: 'High',
    dueDate: '2024-01-18',
    items: [
      { id: 'pi1', partNumber: 'RTR-MOTOR-001', description: 'Brushless DC Motor 2205', qtyToPick: 4, qtyPicked: 2, location: 'WH-01-R01-C01-S01', binQty: 100 },
      { id: 'pi2', partNumber: 'RTR-ESC-002', description: 'Electronic Speed Controller 30A', qtyToPick: 4, qtyPicked: 0, location: 'WH-01-R01-C01-S01', binQty: 80 },
      { id: 'pi3', partNumber: 'RTR-FRAME-003', description: 'Carbon Fiber Frame 250mm', qtyToPick: 1, qtyPicked: 0, location: 'WH-01-R01-C02-S01', binQty: 45 },
    ],
  },
  {
    id: 'pick2',
    pickNumber: 'PICK-2024-00002',
    soNumber: 'SO-2024-00002',
    customer: 'AgriBot Farms',
    status: 'Pending',
    priority: 'Normal',
    dueDate: '2024-01-20',
    items: [
      { id: 'pi4', partNumber: 'RTR-BATT-005', description: 'LiPo Battery 4S 1500mAh', qtyToPick: 10, qtyPicked: 0, location: 'WH-01-R01-C03-S01', binQty: 60 },
      { id: 'pi5', partNumber: 'RTR-PROP-004', description: 'Propeller 5x4.5 (Set of 4)', qtyToPick: 20, qtyPicked: 0, location: 'WH-02-R01-C01-S01', binQty: 500 },
    ],
  },
  {
    id: 'pick3',
    pickNumber: 'PICK-2024-00003',
    soNumber: 'SO-2024-00003',
    customer: 'SkyView Media',
    status: 'Pending',
    priority: 'Rush',
    dueDate: '2024-01-17',
    items: [
      { id: 'pi6', partNumber: 'RTR-MOTOR-001', description: 'Brushless DC Motor 2205', qtyToPick: 8, qtyPicked: 0, location: 'WH-01-R01-C01-S01', binQty: 100 },
    ],
  },
];

/**
 * GET /api/mobile/picking
 * Get pick lists
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pickId = searchParams.get('pickId');
  const status = searchParams.get('status') || 'Pending,In Progress';
  
  let results = mockPickLists;
  
  // Filter by pick ID
  if (pickId) {
    results = results.filter(pick => pick.id === pickId);
  }
  
  // Filter by status
  const statusList = status.split(',');
  results = results.filter(pick => statusList.includes(pick.status));
  
  // Sort by priority (Rush > High > Normal > Low)
  const priorityOrder = { 'Rush': 0, 'High': 1, 'Normal': 2, 'Low': 3 };
  results.sort((a, b) => 
    (priorityOrder[a.priority as keyof typeof priorityOrder] || 99) - 
    (priorityOrder[b.priority as keyof typeof priorityOrder] || 99)
  );
  
  // Calculate summary
  const summary = {
    totalPicks: results.length,
    rushPicks: results.filter(p => p.priority === 'Rush').length,
    totalItems: results.reduce((sum, pick) => sum + pick.items.length, 0),
    itemsPending: results.reduce((sum, pick) => 
      sum + pick.items.filter(i => i.qtyPicked < i.qtyToPick).length, 0
    ),
  };
  
  return NextResponse.json({
    success: true,
    data: results,
    summary,
  });
}

/**
 * POST /api/mobile/picking
 * Process pick confirmation
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pickId, itemId, qtyPicked, location, serialNumbers, lotNumber, userId } = body;
    
    // Validate required fields
    if (!pickId || !itemId || qtyPicked === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: pickId, itemId, qtyPicked' },
        { status: 400 }
      );
    }
    
    if (qtyPicked <= 0) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be positive' },
        { status: 400 }
      );
    }
    
    // Find the pick list and item (mock)
    const pickList = mockPickLists.find(p => p.id === pickId);
    if (!pickList) {
      return NextResponse.json(
        { success: false, error: 'Pick list not found' },
        { status: 404 }
      );
    }
    
    const item = pickList.items.find(i => i.id === itemId);
    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Pick item not found' },
        { status: 404 }
      );
    }
    
    // Check remaining to pick
    const remaining = item.qtyToPick - item.qtyPicked;
    if (qtyPicked > remaining) {
      return NextResponse.json(
        { success: false, error: `Quantity exceeds remaining (${remaining})` },
        { status: 400 }
      );
    }
    
    // Check bin quantity
    if (qtyPicked > item.binQty) {
      return NextResponse.json(
        { success: false, error: `Insufficient inventory at location (${item.binQty} available)` },
        { status: 400 }
      );
    }
    
    // In production: Create pick transaction, update inventory
    const pickTxnId = `PICKTXN-${Date.now()}`;
    
    const newQtyPicked = item.qtyPicked + qtyPicked;
    const isComplete = newQtyPicked >= item.qtyToPick;
    
    return NextResponse.json({
      success: true,
      transactionId: pickTxnId,
      message: `Picked ${qtyPicked} units of ${item.partNumber}`,
      data: {
        pickNumber: pickList.pickNumber,
        partNumber: item.partNumber,
        qtyPicked,
        location: location || item.location,
        newTotalPicked: newQtyPicked,
        remainingToPick: item.qtyToPick - newQtyPicked,
        itemComplete: isComplete,
        timestamp: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    console.error('Picking API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process pick' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/mobile/picking
 * Complete pick list
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { pickId, action } = body;
    
    if (!pickId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const pickList = mockPickLists.find(p => p.id === pickId);
    if (!pickList) {
      return NextResponse.json(
        { success: false, error: 'Pick list not found' },
        { status: 404 }
      );
    }
    
    if (action === 'complete') {
      // Check if all items are picked
      const incomplete = pickList.items.filter(i => i.qtyPicked < i.qtyToPick);
      if (incomplete.length > 0) {
        return NextResponse.json({
          success: false,
          error: `${incomplete.length} items not fully picked`,
          incompleteItems: incomplete.map(i => ({
            partNumber: i.partNumber,
            remaining: i.qtyToPick - i.qtyPicked,
          })),
        }, { status: 400 });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Pick list completed',
        data: {
          pickNumber: pickList.pickNumber,
          status: 'Completed',
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Picking PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update pick list' },
      { status: 500 }
    );
  }
}
