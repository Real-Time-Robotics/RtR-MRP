// ═══════════════════════════════════════════════════════════════════
//                    MOBILE SCAN API
//              Process barcode scans and resolve to entities
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseScanBarcode as parseBarcode, getAvailableActions, ScannerEntityType as EntityType } from '@/lib/mobile';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import { prisma } from '@/lib/prisma';
import { checkWriteEndpointLimit, checkReadEndpointLimit } from '@/lib/rate-limit';

// ────────────────────────────────────────────────────────────
// Lookup helpers
// ────────────────────────────────────────────────────────────

async function lookupPart(partNumber: string): Promise<Record<string, unknown> | null> {
  const part = await prisma.part.findFirst({
    where: { partNumber },
    select: {
      id: true,
      partNumber: true,
      name: true,
      category: true,
      unit: true,
      unitCost: true,
      reorderPoint: true,
      status: true,
      inventory: {
        select: {
          quantity: true,
          reservedQty: true,
        },
      },
    },
  });

  if (!part) return null;

  const onHand = part.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
  const reserved = part.inventory.reduce((sum, inv) => sum + inv.reservedQty, 0);

  return {
    id: part.id,
    partNumber: part.partNumber,
    description: part.name,
    category: part.category,
    onHand,
    reserved,
    available: onHand - reserved,
    reorderPoint: part.reorderPoint,
    uom: part.unit,
    unitCost: part.unitCost,
  };
}

async function lookupLocation(code: string): Promise<Record<string, unknown> | null> {
  const warehouse = await prisma.warehouse.findFirst({
    where: { code },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      status: true,
      inventory: {
        select: {
          partId: true,
          quantity: true,
          part: {
            select: {
              partNumber: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!warehouse) return null;

  return {
    id: warehouse.id,
    code: warehouse.code,
    name: warehouse.name,
    warehouse: warehouse.name,
    contents: warehouse.inventory.map((inv) => ({
      partId: inv.partId,
      partNumber: inv.part.partNumber,
      partName: inv.part.name,
      qty: inv.quantity,
    })),
  };
}

async function lookupWorkOrder(woNumber: string): Promise<Record<string, unknown> | null> {
  const wo = await prisma.workOrder.findFirst({
    where: { woNumber },
    select: {
      id: true,
      woNumber: true,
      quantity: true,
      completedQty: true,
      status: true,
      plannedStart: true,
      dueDate: true,
      product: {
        select: {
          sku: true,
          name: true,
        },
      },
    },
  });

  if (!wo) return null;

  return {
    id: wo.id,
    woNumber: wo.woNumber,
    partNumber: wo.product.sku,
    description: wo.product.name,
    qty: wo.quantity,
    completedQty: wo.completedQty,
    status: wo.status,
    startDate: wo.plannedStart?.toISOString() ?? null,
    dueDate: wo.dueDate?.toISOString() ?? null,
  };
}

async function lookupPurchaseOrder(poNumber: string): Promise<Record<string, unknown> | null> {
  const po = await prisma.purchaseOrder.findFirst({
    where: { poNumber },
    select: {
      id: true,
      poNumber: true,
      status: true,
      supplier: {
        select: {
          name: true,
        },
      },
      lines: {
        select: {
          partId: true,
          quantity: true,
          receivedQty: true,
          unitPrice: true,
          part: {
            select: {
              partNumber: true,
            },
          },
        },
      },
    },
  });

  if (!po) return null;

  return {
    id: po.id,
    poNumber: po.poNumber,
    supplier: po.supplier.name,
    status: po.status,
    lines: po.lines.map((line) => ({
      partNumber: line.part.partNumber,
      qtyOrdered: line.quantity,
      qtyReceived: line.receivedQty,
      unitPrice: line.unitPrice,
    })),
  };
}

/**
 * Fuzzy search across parts when barcode type is UNKNOWN.
 * Returns the first matching part (by partNumber or name substring).
 */
async function fuzzyLookupPart(value: string): Promise<{ entity: Record<string, unknown>; type: EntityType } | null> {
  const part = await prisma.part.findFirst({
    where: {
      OR: [
        { partNumber: { contains: value, mode: 'insensitive' } },
        { name: { contains: value, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      partNumber: true,
      name: true,
      category: true,
      unit: true,
      unitCost: true,
      reorderPoint: true,
      inventory: {
        select: {
          quantity: true,
          reservedQty: true,
        },
      },
    },
  });

  if (!part) return null;

  const onHand = part.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
  const reserved = part.inventory.reduce((sum, inv) => sum + inv.reservedQty, 0);

  return {
    type: 'PART',
    entity: {
      id: part.id,
      partNumber: part.partNumber,
      description: part.name,
      category: part.category,
      onHand,
      reserved,
      available: onHand - reserved,
      reorderPoint: part.reorderPoint,
      uom: part.unit,
      unitCost: part.unitCost,
    },
  };
}

// ────────────────────────────────────────────────────────────
// POST /api/mobile/scan
// Process a barcode scan and resolve to entity
// ────────────────────────────────────────────────────────────

export const POST = withAuth(async (req, _context, _session) => {
  // Rate limiting
  const rateLimitResult = await checkWriteEndpointLimit(req);
  if (rateLimitResult) return rateLimitResult;

  try {
    const bodySchema = z.object({
      barcode: z.string(),
      context: z.string().default('general'),
    });

    const rawBody = await req.json();
    const parseResult = bodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parseResult.data;
    const { barcode, context } = body;

    if (!barcode) {
      return NextResponse.json(
        { success: false, error: 'Barcode is required' },
        { status: 400 }
      );
    }

    // Parse the barcode
    const scanResult = parseBarcode(barcode);

    // Try to resolve the entity from the database
    let entity: Record<string, unknown> | null = null;
    let resolved = false;

    switch (scanResult.type) {
      case 'PART': {
        entity = await lookupPart(scanResult.value);
        resolved = entity !== null;
        break;
      }

      case 'LOCATION': {
        entity = await lookupLocation(scanResult.value);
        resolved = entity !== null;
        break;
      }

      case 'WORK_ORDER': {
        entity = await lookupWorkOrder(scanResult.value);
        resolved = entity !== null;
        break;
      }

      case 'PURCHASE_ORDER': {
        entity = await lookupPurchaseOrder(scanResult.value);
        resolved = entity !== null;
        break;
      }

      default: {
        // Try fuzzy search across parts when type is unknown
        const fuzzyResult = await fuzzyLookupPart(scanResult.value);
        if (fuzzyResult) {
          entity = fuzzyResult.entity;
          scanResult.type = fuzzyResult.type;
          resolved = true;
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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/mobile/scan' });
    return NextResponse.json(
      { success: false, error: 'Failed to process scan' },
      { status: 500 }
    );
  }
});

// ────────────────────────────────────────────────────────────
// GET /api/mobile/scan
// Get recent scan history
// ────────────────────────────────────────────────────────────

export const GET = withAuth(async (req, _context, _session) => {
  // Rate limiting
  const rateLimitResult = await checkReadEndpointLimit(req);
  if (rateLimitResult) return rateLimitResult;

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '20');

  // ScanLog table migration pending - scan history currently stored client-side in IndexedDB.
  // When ScanLog model is added to schema, uncomment the following:
  //   const history = await prisma.scanLog.findMany({
  //     where: { userId: session.user.id },
  //     orderBy: { createdAt: 'desc' },
  //     take: limit,
  //   });
  //   return NextResponse.json({ success: true, history, limit, source: 'database' });

  return NextResponse.json({
    success: true,
    history: [],
    limit,
    source: 'client-indexeddb',
    message: 'Server-side scan history will be available after ScanLog migration. Currently using client-side IndexedDB.',
  });
});
