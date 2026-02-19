/**
 * Change Impact API Endpoint
 * POST /api/change-impact
 * Calculates the impact of changes on related entities
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ImpactableEntity, FieldChange, ChangeImpactResponse } from '@/lib/change-impact/types';
import { calculatePartImpact } from '@/lib/change-impact/calculators/part-impact';
import { calculateBOMImpact } from '@/lib/change-impact/calculators/bom-impact';
import { calculateInventoryImpact } from '@/lib/change-impact/calculators/inventory-impact';
import { calculateSupplierImpact } from '@/lib/change-impact/calculators/supplier-impact';
import { calculatePurchaseOrderImpact } from '@/lib/change-impact/calculators/purchase-order-impact';
import { calculateSalesOrderImpact } from '@/lib/change-impact/calculators/sales-order-impact';
import { calculateCustomerImpact } from '@/lib/change-impact/calculators/customer-impact';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';

import { checkWriteEndpointLimit } from '@/lib/rate-limit';
// Request validation schema
const fieldChangeSchema = z.object({
  field: z.string(),
  fieldLabel: z.string(),
  oldValue: z.unknown(),
  newValue: z.unknown(),
  valueType: z.enum(['number', 'string', 'currency', 'date', 'percentage', 'boolean']),
});

const changeImpactRequestSchema = z.object({
  entity: z.enum([
    'part',
    'bom',
    'bomLine',
    'inventory',
    'workOrder',
    'purchaseOrder',
    'poLine',
    'salesOrder',
    'soLine',
    'supplier',
    'customer',
  ]),
  entityId: z.string().min(1),
  changes: z.array(fieldChangeSchema).min(1),
});

export const POST = withAuth(async (request: NextRequest, context, session): Promise<Response> => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const body = await request.json();

    // Validate request
    const validationResult = changeImpactRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid request: ${validationResult.error.message}`,
        },
        { status: 400 }
      );
    }

    const { entity, entityId, changes } = validationResult.data;

    // Calculate impact based on entity type
    let result;
    switch (entity as ImpactableEntity) {
      case 'part':
        result = await calculatePartImpact(entityId, changes as FieldChange[]);
        break;
      case 'bom':
        result = await calculateBOMImpact(entityId, changes as FieldChange[]);
        break;
      case 'inventory':
        result = await calculateInventoryImpact(entityId, changes as FieldChange[]);
        break;
      case 'supplier':
        result = await calculateSupplierImpact(entityId, changes as FieldChange[]);
        break;
      case 'purchaseOrder':
        result = await calculatePurchaseOrderImpact(entityId, changes as FieldChange[]);
        break;
      case 'salesOrder':
        result = await calculateSalesOrderImpact(entityId, changes as FieldChange[]);
        break;
      case 'customer':
        result = await calculateCustomerImpact(entityId, changes as FieldChange[]);
        break;
      // Add more entity calculators as needed
      default:
        return NextResponse.json(
          {
            success: false,
            error: `Impact calculation not implemented for entity: ${entity}`,
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/change-impact' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate change impact',
      },
      { status: 500 }
    );
  }
});
