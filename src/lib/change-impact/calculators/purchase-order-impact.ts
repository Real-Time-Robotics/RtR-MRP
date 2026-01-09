/**
 * Purchase Order Impact Calculator
 * Calculates the impact of changes to a PO on related entities
 */

import { prisma } from '@/lib/prisma';
import {
  FieldChange,
  ImpactedItem,
  ChangeImpactResult,
  ImpactableEntity,
} from '../types';

export async function calculatePurchaseOrderImpact(
  poId: string,
  changes: FieldChange[]
): Promise<ChangeImpactResult> {
  // Fetch PO with lines
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    select: {
      id: true,
      poNumber: true,
      status: true,
      lines: {
        select: {
          id: true,
          partId: true,
          quantity: true,
          part: {
            select: { partNumber: true, name: true },
          },
        },
      },
    },
  });

  if (!po) {
    throw new Error(`Purchase Order not found: ${poId}`);
  }

  const impactedItems: ImpactedItem[] = [];

  // Check for status changes
  const statusChange = changes.find(c => c.field === 'status');
  if (statusChange) {
    const newStatus = statusChange.newValue as string;
    const oldStatus = statusChange.oldValue as string;

    // Cancelled → affects inventory expectations
    if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
      for (const line of po.lines) {
        impactedItems.push({
          id: line.id,
          entity: 'inventory',
          entityCode: line.part.partNumber,
          entityName: `${line.part.name} - Expected Qty: ${line.quantity}`,
          relationship: 'Inventory - Pending Receipt Cancelled',
          changes: [{
            field: 'pendingReceipt',
            fieldLabel: 'Pending Receipt',
            oldValue: line.quantity,
            newValue: 0,
            valueType: 'number',
          }],
          navigationUrl: `/inventory?partId=${line.partId}`,
          canNavigate: true,
        });
      }

      // Check for MRP suggestions that may need recalculation
      const mrpCount = await prisma.mrpSuggestion.count({
        where: {
          partId: { in: po.lines.map(l => l.partId) },
          status: 'pending',
        },
      });

      if (mrpCount > 0) {
        impactedItems.push({
          id: poId,
          entity: 'part',
          entityCode: po.poNumber,
          entityName: `${mrpCount} MRP Suggestions`,
          relationship: 'MRP - Recalculation Needed',
          changes: [{
            field: 'mrpStatus',
            fieldLabel: 'MRP Status',
            oldValue: 'Calculated',
            newValue: 'Needs Recalc',
            valueType: 'string',
          }],
          navigationUrl: `/mrp`,
          canNavigate: true,
        });
      }
    }

    // Received → affects inventory
    if (newStatus === 'received' && oldStatus !== 'received') {
      for (const line of po.lines) {
        impactedItems.push({
          id: line.id,
          entity: 'inventory',
          entityCode: line.part.partNumber,
          entityName: `${line.part.name}`,
          relationship: 'Inventory - Quantity Increase',
          changes: [{
            field: 'quantity',
            fieldLabel: 'Quantity',
            oldValue: 'Current',
            newValue: `+${line.quantity}`,
            valueType: 'string',
          }],
          navigationUrl: `/inventory?partId=${line.partId}`,
          canNavigate: true,
        });
      }
    }
  }

  return {
    sourceEntity: 'purchaseOrder' as ImpactableEntity,
    sourceId: poId,
    sourceCode: po.poNumber,
    changes,
    impactedItems,
    totalImpactedCount: impactedItems.length,
    calculatedAt: new Date(),
  };
}
