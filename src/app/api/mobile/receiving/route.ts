// ═══════════════════════════════════════════════════════════════════
//                    MOBILE RECEIVING API
//              Purchase order receiving operations
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Mock PO data
const mockPurchaseOrders = [
  {
    id: 'po1',
    poNumber: 'PO-2024-00001',
    supplier: 'MotorTech Inc.',
    status: 'Partial',
    orderDate: '2024-01-10',
    expectedDate: '2024-01-20',
    lines: [
      { id: 'pol1', partNumber: 'RTR-MOTOR-001', description: 'Brushless DC Motor 2205', qtyOrdered: 100, qtyReceived: 50, qtyRemaining: 50, unitCost: 45.00 },
      { id: 'pol2', partNumber: 'RTR-ESC-002', description: 'Electronic Speed Controller 30A', qtyOrdered: 50, qtyReceived: 0, qtyRemaining: 50, unitCost: 25.00 },
    ],
  },
  {
    id: 'po2',
    poNumber: 'PO-2024-00002',
    supplier: 'BatteryWorld',
    status: 'Open',
    orderDate: '2024-01-12',
    expectedDate: '2024-01-22',
    lines: [
      { id: 'pol3', partNumber: 'RTR-BATT-005', description: 'LiPo Battery 4S 1500mAh', qtyOrdered: 50, qtyReceived: 0, qtyRemaining: 50, unitCost: 35.00 },
    ],
  },
  {
    id: 'po3',
    poNumber: 'PO-2024-00003',
    supplier: 'CarbonFrames Ltd.',
    status: 'Open',
    orderDate: '2024-01-14',
    expectedDate: '2024-01-24',
    lines: [
      { id: 'pol4', partNumber: 'RTR-FRAME-003', description: 'Carbon Fiber Frame 250mm', qtyOrdered: 30, qtyReceived: 0, qtyRemaining: 30, unitCost: 120.00 },
      { id: 'pol5', partNumber: 'RTR-PROP-004', description: 'Propeller 5x4.5 (Set of 4)', qtyOrdered: 200, qtyReceived: 0, qtyRemaining: 200, unitCost: 8.00 },
    ],
  },
];

/**
 * GET /api/mobile/receiving
 * Get open POs for receiving
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const poId = searchParams.get('poId');
  const status = searchParams.get('status') || 'Open,Partial';
  
  let results = mockPurchaseOrders;
  
  // Filter by PO ID
  if (poId) {
    results = results.filter(po => po.id === poId);
  }
  
  // Filter by status
  const statusList = status.split(',');
  results = results.filter(po => statusList.includes(po.status));
  
  // Calculate summary stats
  const summary = {
    totalPOs: results.length,
    totalLines: results.reduce((sum, po) => sum + po.lines.length, 0),
    totalQtyRemaining: results.reduce((sum, po) => 
      sum + po.lines.reduce((lineSum, line) => lineSum + line.qtyRemaining, 0), 0
    ),
  };
  
  return NextResponse.json({
    success: true,
    data: results,
    summary,
  });
}

/**
 * POST /api/mobile/receiving
 * Process PO receipt
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { poId, lineId, qtyReceived, locationId, lotNumber, notes, userId } = body;
    
    // Validate required fields
    if (!poId || !lineId || qtyReceived === undefined || !locationId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: poId, lineId, qtyReceived, locationId' },
        { status: 400 }
      );
    }
    
    if (qtyReceived <= 0) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be positive' },
        { status: 400 }
      );
    }
    
    // Find the PO and line (mock)
    const po = mockPurchaseOrders.find(p => p.id === poId);
    if (!po) {
      return NextResponse.json(
        { success: false, error: 'Purchase order not found' },
        { status: 404 }
      );
    }
    
    const line = po.lines.find(l => l.id === lineId);
    if (!line) {
      return NextResponse.json(
        { success: false, error: 'PO line not found' },
        { status: 404 }
      );
    }
    
    // Check if qty exceeds remaining
    if (qtyReceived > line.qtyRemaining) {
      return NextResponse.json(
        { success: false, error: `Quantity exceeds remaining (${line.qtyRemaining})` },
        { status: 400 }
      );
    }
    
    // In production: Create receipt transaction, update inventory
    const receiptId = `RCV-${Date.now()}`;
    
    return NextResponse.json({
      success: true,
      receiptId,
      message: `Received ${qtyReceived} units of ${line.partNumber}`,
      data: {
        poNumber: po.poNumber,
        partNumber: line.partNumber,
        qtyReceived,
        location: locationId,
        lotNumber,
        newQtyReceived: line.qtyReceived + qtyReceived,
        newQtyRemaining: line.qtyRemaining - qtyReceived,
        timestamp: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/mobile/receiving' });
    return NextResponse.json(
      { success: false, error: 'Failed to process receipt' },
      { status: 500 }
    );
  }
}
