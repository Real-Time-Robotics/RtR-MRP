// ═══════════════════════════════════════════════════════════════════
//                    MOBILE INVENTORY API
//              Inventory adjustments, transfers, and counts
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';

import { checkWriteEndpointLimit, checkReadEndpointLimit } from '@/lib/rate-limit';
// Types
interface InventoryAdjustment {
  partId: string;
  partNumber: string;
  locationId: string;
  adjustmentType: 'add' | 'remove';
  quantity: number;
  reason: string;
  notes?: string;
  userId: string;
}

interface InventoryTransfer {
  partId: string;
  partNumber: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  notes?: string;
  userId: string;
}

interface CycleCountItem {
  partId: string;
  partNumber: string;
  locationId: string;
  systemQty: number;
  countedQty: number;
  variance: number;
  userId: string;
}

// Mock inventory data
const mockInventory: Record<string, { partId: string; locationId: string; qty: number }[]> = {
  '1': [
    { partId: '1', locationId: 'loc1', qty: 100 },
    { partId: '1', locationId: 'loc2', qty: 50 },
  ],
  '2': [
    { partId: '2', locationId: 'loc1', qty: 80 },
  ],
};

/**
 * POST /api/mobile/inventory
 * Handle inventory operations
 */
export const POST = withAuth(async (req, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(req);
    if (rateLimitResult) return rateLimitResult;

  try {
const bodySchema = z.object({
      action: z.string(),
      partId: z.string().optional(),
      partNumber: z.string().optional(),
      locationId: z.string().optional(),
      adjustmentType: z.enum(['add', 'remove']).optional(),
      quantity: z.number().optional(),
      reason: z.string().optional(),
      notes: z.string().optional(),
      userId: z.string().optional(),
      fromLocationId: z.string().optional(),
      toLocationId: z.string().optional(),
      items: z.array(z.any()).optional(),
    });

    const rawBody = await req.json();
    const parseResult = bodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { action, ...data } = parseResult.data;
    
    switch (action) {
      case 'adjust':
        return handleAdjustment(data as InventoryAdjustment);
      case 'transfer':
        return handleTransfer(data as InventoryTransfer);
      case 'count':
        return handleCycleCount(data as { items: CycleCountItem[] });
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/mobile/inventory' });
    return NextResponse.json(
      { success: false, error: 'Failed to process inventory operation' },
      { status: 500 }
    );
  }
});

/**
 * Handle inventory adjustment
 */
async function handleAdjustment(data: InventoryAdjustment) {
  // Validate required fields
  if (!data.partId || !data.locationId || !data.quantity || !data.reason) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }
  
  if (data.quantity <= 0) {
    return NextResponse.json(
      { success: false, error: 'Quantity must be positive' },
      { status: 400 }
    );
  }
  
  // In production: Create transaction record and update inventory
  const transactionId = `TXN-${Date.now()}`;
  
  // Mock response
  return NextResponse.json({
    success: true,
    transactionId,
    message: `Inventory ${data.adjustmentType === 'add' ? 'increased' : 'decreased'} by ${data.quantity}`,
    data: {
      partNumber: data.partNumber,
      location: data.locationId,
      adjustmentType: data.adjustmentType,
      quantity: data.quantity,
      reason: data.reason,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Handle inventory transfer
 */
async function handleTransfer(data: InventoryTransfer) {
  // Validate required fields
  if (!data.partId || !data.fromLocationId || !data.toLocationId || !data.quantity) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }
  
  if (data.fromLocationId === data.toLocationId) {
    return NextResponse.json(
      { success: false, error: 'Source and destination must be different' },
      { status: 400 }
    );
  }
  
  if (data.quantity <= 0) {
    return NextResponse.json(
      { success: false, error: 'Quantity must be positive' },
      { status: 400 }
    );
  }
  
  // Check available quantity (mock)
  const availableQty = 100; // In production: query database
  if (data.quantity > availableQty) {
    return NextResponse.json(
      { success: false, error: `Insufficient quantity. Available: ${availableQty}` },
      { status: 400 }
    );
  }
  
  // In production: Create transfer transaction
  const transferId = `TRF-${Date.now()}`;
  
  return NextResponse.json({
    success: true,
    transferId,
    message: `Transferred ${data.quantity} units successfully`,
    data: {
      partNumber: data.partNumber,
      fromLocation: data.fromLocationId,
      toLocation: data.toLocationId,
      quantity: data.quantity,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Handle cycle count
 */
async function handleCycleCount(data: { items: CycleCountItem[] }) {
  if (!data.items || data.items.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No items to count' },
      { status: 400 }
    );
  }
  
  // Process count items
  const results = data.items.map(item => ({
    partId: item.partId,
    partNumber: item.partNumber,
    locationId: item.locationId,
    systemQty: item.systemQty,
    countedQty: item.countedQty,
    variance: item.countedQty - item.systemQty,
    variancePercent: item.systemQty > 0 
      ? ((item.countedQty - item.systemQty) / item.systemQty * 100).toFixed(1)
      : 'N/A',
  }));
  
  // Calculate summary
  const totalVariance = results.reduce((sum, r) => sum + r.variance, 0);
  const itemsWithVariance = results.filter(r => r.variance !== 0).length;
  
  // In production: Create count session and update inventory
  const countSessionId = `CNT-${Date.now()}`;
  
  return NextResponse.json({
    success: true,
    countSessionId,
    message: `Cycle count completed for ${data.items.length} items`,
    summary: {
      totalItems: data.items.length,
      itemsWithVariance,
      totalVariance,
    },
    results,
    timestamp: new Date().toISOString(),
  });
}

/**
 * GET /api/mobile/inventory
 * Get inventory data
 */
export const GET = withAuth(async (req, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(req);
    if (rateLimitResult) return rateLimitResult;
const { searchParams } = new URL(req.url);
  const partId = searchParams.get('partId');
  const locationId = searchParams.get('locationId');
  const search = searchParams.get('search');
  
  // Mock data response
  const mockParts = [
    { id: '1', partNumber: 'RTR-MOTOR-001', description: 'Brushless DC Motor 2205', onHand: 150, reserved: 20, available: 130, locations: [{ code: 'WH-01-R01-C01-S01', qty: 100 }, { code: 'WH-01-R01-C02-S01', qty: 50 }] },
    { id: '2', partNumber: 'RTR-ESC-002', description: 'Electronic Speed Controller 30A', onHand: 80, reserved: 15, available: 65, locations: [{ code: 'WH-01-R01-C01-S01', qty: 80 }] },
    { id: '3', partNumber: 'RTR-FRAME-003', description: 'Carbon Fiber Frame 250mm', onHand: 45, reserved: 5, available: 40, locations: [{ code: 'WH-01-R01-C02-S01', qty: 45 }] },
    { id: '4', partNumber: 'RTR-PROP-004', description: 'Propeller 5x4.5 (Set of 4)', onHand: 500, reserved: 100, available: 400, locations: [{ code: 'WH-02-R01-C01-S01', qty: 500 }] },
    { id: '5', partNumber: 'RTR-BATT-005', description: 'LiPo Battery 4S 1500mAh', onHand: 60, reserved: 10, available: 50, locations: [{ code: 'WH-01-R01-C03-S01', qty: 60 }] },
  ];
  
  let results = mockParts;
  
  // Filter by part ID
  if (partId) {
    results = results.filter(p => p.id === partId);
  }
  
  // Filter by search term
  if (search) {
    const searchLower = search.toLowerCase();
    results = results.filter(p => 
      p.partNumber.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower)
    );
  }
  
  return NextResponse.json({
    success: true,
    data: results,
    total: results.length,
  });
});
