// ═══════════════════════════════════════════════════════════════════
//                    MOBILE SYNC API
//              Offline sync and master data download
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Mock master data
const MOCK_PARTS = [
  { id: '1', partNumber: 'RTR-MOTOR-001', description: 'Brushless DC Motor 2205', category: 'Motors', uom: 'EA', onHand: 150, reserved: 20, available: 130, reorderPoint: 50, locations: [{ locationId: 'loc1', code: 'WH-01-R01-C01-S01', qty: 100 }, { locationId: 'loc2', code: 'WH-01-R01-C02-S01', qty: 50 }], updatedAt: Date.now() },
  { id: '2', partNumber: 'RTR-ESC-002', description: 'Electronic Speed Controller 30A', category: 'Electronics', uom: 'EA', onHand: 80, reserved: 15, available: 65, reorderPoint: 30, locations: [{ locationId: 'loc1', code: 'WH-01-R01-C01-S01', qty: 80 }], updatedAt: Date.now() },
  { id: '3', partNumber: 'RTR-FRAME-003', description: 'Carbon Fiber Frame 250mm', category: 'Frames', uom: 'EA', onHand: 45, reserved: 5, available: 40, reorderPoint: 20, locations: [{ locationId: 'loc2', code: 'WH-01-R01-C02-S01', qty: 45 }], updatedAt: Date.now() },
  { id: '4', partNumber: 'RTR-PROP-004', description: 'Propeller 5x4.5 (Set of 4)', category: 'Propellers', uom: 'SET', onHand: 500, reserved: 100, available: 400, reorderPoint: 200, locations: [{ locationId: 'loc3', code: 'WH-02-R01-C01-S01', qty: 500 }], updatedAt: Date.now() },
  { id: '5', partNumber: 'RTR-BATT-005', description: 'LiPo Battery 4S 1500mAh', category: 'Batteries', uom: 'EA', onHand: 60, reserved: 10, available: 50, reorderPoint: 25, locations: [{ locationId: 'loc4', code: 'WH-01-R01-C03-S01', qty: 60 }], updatedAt: Date.now() },
  { id: '6', partNumber: 'RTR-FC-006', description: 'Flight Controller F7', category: 'Electronics', uom: 'EA', onHand: 35, reserved: 5, available: 30, reorderPoint: 15, locations: [{ locationId: 'loc1', code: 'WH-01-R01-C01-S01', qty: 35 }], updatedAt: Date.now() },
  { id: '7', partNumber: 'RTR-GPS-007', description: 'GPS Module M8N', category: 'Electronics', uom: 'EA', onHand: 40, reserved: 8, available: 32, reorderPoint: 20, locations: [{ locationId: 'loc1', code: 'WH-01-R01-C01-S01', qty: 40 }], updatedAt: Date.now() },
  { id: '8', partNumber: 'RTR-CAM-008', description: 'FPV Camera 1200TVL', category: 'Electronics', uom: 'EA', onHand: 25, reserved: 3, available: 22, reorderPoint: 10, locations: [{ locationId: 'loc2', code: 'WH-01-R01-C02-S01', qty: 25 }], updatedAt: Date.now() },
  { id: '9', partNumber: 'RTR-VTX-009', description: 'Video Transmitter 600mW', category: 'Electronics', uom: 'EA', onHand: 30, reserved: 5, available: 25, reorderPoint: 15, locations: [{ locationId: 'loc2', code: 'WH-01-R01-C02-S01', qty: 30 }], updatedAt: Date.now() },
  { id: '10', partNumber: 'RTR-RX-010', description: 'Receiver FrSky XM+', category: 'Electronics', uom: 'EA', onHand: 55, reserved: 10, available: 45, reorderPoint: 25, locations: [{ locationId: 'loc1', code: 'WH-01-R01-C01-S01', qty: 55 }], updatedAt: Date.now() },
];

const MOCK_LOCATIONS = [
  { id: 'loc1', code: 'WH-01-R01-C01-S01', name: 'Main WH - Rack 1 - Column 1 - Shelf 1', warehouseId: 'wh1', warehouseName: 'Main Warehouse', zone: 'A', aisle: '01', rack: '01', shelf: '01' },
  { id: 'loc2', code: 'WH-01-R01-C02-S01', name: 'Main WH - Rack 1 - Column 2 - Shelf 1', warehouseId: 'wh1', warehouseName: 'Main Warehouse', zone: 'A', aisle: '01', rack: '01', shelf: '01' },
  { id: 'loc3', code: 'WH-02-R01-C01-S01', name: 'Secondary WH - Rack 1', warehouseId: 'wh2', warehouseName: 'Secondary Warehouse', zone: 'B', aisle: '01', rack: '01', shelf: '01' },
  { id: 'loc4', code: 'WH-01-R01-C03-S01', name: 'Main WH - Rack 1 - Column 3 - Shelf 1', warehouseId: 'wh1', warehouseName: 'Main Warehouse', zone: 'A', aisle: '01', rack: '01', shelf: '01' },
  { id: 'loc5', code: 'WH-01-R02-C01-S01', name: 'Main WH - Rack 2 - Column 1 - Shelf 1', warehouseId: 'wh1', warehouseName: 'Main Warehouse', zone: 'A', aisle: '01', rack: '02', shelf: '01' },
  { id: 'loc6', code: 'WH-01-R02-C01-S02', name: 'Main WH - Rack 2 - Column 1 - Shelf 2', warehouseId: 'wh1', warehouseName: 'Main Warehouse', zone: 'A', aisle: '01', rack: '02', shelf: '02' },
  { id: 'loc7', code: 'WH-03-RECV-001', name: 'Receiving Dock 1', warehouseId: 'wh3', warehouseName: 'Receiving Area', zone: 'RECV', aisle: 'DOCK', rack: '01', shelf: '01' },
  { id: 'loc8', code: 'WH-03-SHIP-001', name: 'Shipping Dock 1', warehouseId: 'wh3', warehouseName: 'Shipping Area', zone: 'SHIP', aisle: 'DOCK', rack: '01', shelf: '01' },
];

/**
 * GET /api/mobile/sync
 * Get sync status and download master data
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dataType = searchParams.get('type');
  const since = searchParams.get('since'); // Timestamp for delta sync
  
  // Download specific data type
  if (dataType === 'parts') {
    let data = MOCK_PARTS;
    if (since) {
      const sinceTs = parseInt(since);
      data = data.filter(p => p.updatedAt > sinceTs);
    }
    return NextResponse.json(data);
  }
  
  if (dataType === 'locations') {
    return NextResponse.json(MOCK_LOCATIONS);
  }
  
  // Return sync status
  return NextResponse.json({
    success: true,
    serverTime: new Date().toISOString(),
    dataVersions: {
      parts: { count: MOCK_PARTS.length, lastModified: Date.now() },
      locations: { count: MOCK_LOCATIONS.length, lastModified: Date.now() },
    },
    endpoints: {
      parts: '/api/mobile/sync?type=parts',
      locations: '/api/mobile/sync?type=locations',
    },
  });
}

/**
 * POST /api/mobile/sync
 * Process offline operations
 */
export async function POST(req: NextRequest) {
  try {
    const operation = await req.json();
    const { id, type, data, createdAt } = operation;
    
    if (!type || !data) {
      return NextResponse.json(
        { success: false, error: 'Invalid operation format' },
        { status: 400 }
      );
    }
    
    // Process based on operation type
    let result;
    
    switch (type) {
      case 'inventory_adjust':
        result = await processInventoryAdjust(data);
        break;
      case 'inventory_transfer':
        result = await processInventoryTransfer(data);
        break;
      case 'inventory_count':
        result = await processInventoryCount(data);
        break;
      case 'po_receive':
        result = await processPOReceive(data);
        break;
      case 'so_pick':
        result = await processSOPick(data);
        break;
      case 'wo_start':
        result = await processWOStart(data);
        break;
      case 'wo_complete':
        result = await processWOComplete(data);
        break;
      case 'quality_inspect':
        result = await processQualityInspect(data);
        break;
      default:
        return NextResponse.json(
          { success: false, error: `Unknown operation type: ${type}` },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      success: true,
      operationId: id,
      serverTransactionId: `SRV-${Date.now()}`,
      result,
      processedAt: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/mobile/sync' });
    return NextResponse.json(
      { success: false, error: 'Failed to process operation' },
      { status: 500 }
    );
  }
}

// Operation processors
async function processInventoryAdjust(data: any) {
  // In production: Create inventory transaction
  return { transactionId: `ADJ-${Date.now()}`, status: 'completed' };
}

async function processInventoryTransfer(data: any) {
  return { transferId: `TRF-${Date.now()}`, status: 'completed' };
}

async function processInventoryCount(data: any) {
  return { countId: `CNT-${Date.now()}`, status: 'completed' };
}

async function processPOReceive(data: any) {
  return { receiptId: `RCV-${Date.now()}`, status: 'completed' };
}

async function processSOPick(data: any) {
  return { pickId: `PICK-${Date.now()}`, status: 'completed' };
}

async function processWOStart(data: any) {
  return { woId: data.woId, status: 'started' };
}

async function processWOComplete(data: any) {
  return { woId: data.woId, status: 'completed' };
}

async function processQualityInspect(data: any) {
  return { inspectionId: `QI-${Date.now()}`, status: 'completed' };
}

/**
 * PUT /api/mobile/sync
 * Bulk sync operations
 */
export async function PUT(req: NextRequest) {
  try {
    const { operations } = await req.json();
    
    if (!Array.isArray(operations)) {
      return NextResponse.json(
        { success: false, error: 'Operations must be an array' },
        { status: 400 }
      );
    }
    
    const results = [];
    let successCount = 0;
    let failedCount = 0;
    
    for (const op of operations) {
      try {
        // Process each operation
        const response = await fetch(new URL('/api/mobile/sync', req.url), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(op),
        });
        
        if (response.ok) {
          const result = await response.json();
          results.push({ id: op.id, success: true, result });
          successCount++;
        } else {
          results.push({ id: op.id, success: false, error: 'Processing failed' });
          failedCount++;
        }
      } catch (error) {
        results.push({ id: op.id, success: false, error: 'Processing error' });
        failedCount++;
      }
    }
    
    return NextResponse.json({
      success: true,
      summary: {
        total: operations.length,
        success: successCount,
        failed: failedCount,
      },
      results,
      syncedAt: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/mobile/sync' });
    return NextResponse.json(
      { success: false, error: 'Failed to process bulk sync' },
      { status: 500 }
    );
  }
}
