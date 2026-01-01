// ═══════════════════════════════════════════════════════════════════
//                    MOBILE SCAN API
//              Process barcode scans and resolve to entities
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { parseScanBarcode as parseBarcode, getAvailableActions, ScannerEntityType as EntityType } from '@/lib/mobile';

// Mock data for demonstration - replace with Prisma queries in production
const MOCK_PARTS: Record<string, { id: string; partNumber: string; description: string; category: string; onHand: number; reserved: number; reorderPoint: number; uom: string; unitCost: number }> = {
  'RTR-MOTOR-001': { id: '1', partNumber: 'RTR-MOTOR-001', description: 'Brushless DC Motor 2205', category: 'Motors', onHand: 150, reserved: 20, reorderPoint: 50, uom: 'EA', unitCost: 45.00 },
  'RTR-ESC-002': { id: '2', partNumber: 'RTR-ESC-002', description: 'Electronic Speed Controller 30A', category: 'Electronics', onHand: 80, reserved: 15, reorderPoint: 30, uom: 'EA', unitCost: 25.00 },
  'RTR-FRAME-003': { id: '3', partNumber: 'RTR-FRAME-003', description: 'Carbon Fiber Frame 250mm', category: 'Frames', onHand: 45, reserved: 5, reorderPoint: 20, uom: 'EA', unitCost: 120.00 },
  'RTR-PROP-004': { id: '4', partNumber: 'RTR-PROP-004', description: 'Propeller 5x4.5 (Set of 4)', category: 'Propellers', onHand: 500, reserved: 100, reorderPoint: 200, uom: 'SET', unitCost: 8.00 },
  'RTR-BATT-005': { id: '5', partNumber: 'RTR-BATT-005', description: 'LiPo Battery 4S 1500mAh', category: 'Batteries', onHand: 60, reserved: 10, reorderPoint: 25, uom: 'EA', unitCost: 35.00 },
};

const MOCK_LOCATIONS: Record<string, { id: string; code: string; name: string; warehouse: string; contents: { partId: string; qty: number }[] }> = {
  'WH-01-R01-C01-S01': { id: 'loc1', code: 'WH-01-R01-C01-S01', name: 'Main Warehouse - Rack 1', warehouse: 'Main Warehouse', contents: [{ partId: '1', qty: 50 }, { partId: '2', qty: 30 }] },
  'WH-01-R01-C02-S01': { id: 'loc2', code: 'WH-01-R01-C02-S01', name: 'Main Warehouse - Rack 2', warehouse: 'Main Warehouse', contents: [{ partId: '3', qty: 20 }] },
  'WH-02-R01-C01-S01': { id: 'loc3', code: 'WH-02-R01-C01-S01', name: 'Secondary Warehouse', warehouse: 'Secondary Warehouse', contents: [{ partId: '4', qty: 200 }] },
};

const MOCK_WORK_ORDERS: Record<string, { id: string; woNumber: string; partNumber: string; description: string; qty: number; status: string; startDate: string; dueDate: string }> = {
  'WO-2024-00001': { id: 'wo1', woNumber: 'WO-2024-00001', partNumber: 'RTR-DRONE-HERA', description: 'HERA X4 Pro Assembly', qty: 50, status: 'In Progress', startDate: '2024-01-15', dueDate: '2024-01-20' },
  'WO-2024-00002': { id: 'wo2', woNumber: 'WO-2024-00002', partNumber: 'RTR-DRONE-ZEUS', description: 'ZEUS H6 Heavy Assembly', qty: 25, status: 'Pending', startDate: '2024-01-18', dueDate: '2024-01-25' },
};

const MOCK_PURCHASE_ORDERS: Record<string, { id: string; poNumber: string; supplier: string; status: string; lines: { partNumber: string; qtyOrdered: number; qtyReceived: number }[] }> = {
  'PO-2024-00001': { id: 'po1', poNumber: 'PO-2024-00001', supplier: 'MotorTech Inc.', status: 'Partial', lines: [{ partNumber: 'RTR-MOTOR-001', qtyOrdered: 100, qtyReceived: 50 }] },
  'PO-2024-00002': { id: 'po2', poNumber: 'PO-2024-00002', supplier: 'BatteryWorld', status: 'Open', lines: [{ partNumber: 'RTR-BATT-005', qtyOrdered: 50, qtyReceived: 0 }] },
};

/**
 * POST /api/mobile/scan
 * Process a barcode scan and resolve to entity
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { barcode, context = 'general' } = body;
    
    if (!barcode) {
      return NextResponse.json(
        { success: false, error: 'Barcode is required' },
        { status: 400 }
      );
    }
    
    // Parse the barcode
    const scanResult = parseBarcode(barcode);
    
    // Try to resolve the entity
    let entity: Record<string, unknown> | null = null;
    let resolved = false;
    
    switch (scanResult.type) {
      case 'PART': {
        const part = MOCK_PARTS[scanResult.value];
        if (part) {
          entity = {
            ...part,
            available: part.onHand - part.reserved,
          };
          resolved = true;
        }
        break;
      }
      
      case 'LOCATION': {
        const location = MOCK_LOCATIONS[scanResult.value];
        if (location) {
          entity = location;
          resolved = true;
        }
        break;
      }
      
      case 'WORK_ORDER': {
        const wo = MOCK_WORK_ORDERS[scanResult.value];
        if (wo) {
          entity = wo;
          resolved = true;
        }
        break;
      }
      
      case 'PURCHASE_ORDER': {
        const po = MOCK_PURCHASE_ORDERS[scanResult.value];
        if (po) {
          entity = po;
          resolved = true;
        }
        break;
      }
      
      default:
        // Try to find by searching all entities
        for (const [key, part] of Object.entries(MOCK_PARTS)) {
          if (key.includes(scanResult.value) || part.description.toUpperCase().includes(scanResult.value)) {
            entity = { ...part, available: part.onHand - part.reserved };
            scanResult.type = 'PART';
            resolved = true;
            break;
          }
        }
    }
    
    // Get available actions
    const actions = getAvailableActions(scanResult.type as EntityType, context);
    
    return NextResponse.json({
      success: true,
      scan: {
        raw: barcode,
        type: scanResult.type,
        value: scanResult.value,
        format: scanResult.format,
        confidence: scanResult.confidence,
      },
      resolved,
      entity,
      actions,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process scan' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mobile/scan/history
 * Get recent scan history
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  
  // In production, fetch from database
  // For now, return empty array (history is stored client-side in IndexedDB)
  return NextResponse.json({
    success: true,
    history: [],
    limit,
  });
}
