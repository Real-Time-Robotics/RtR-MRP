/**
 * Sales Order Impact Calculator
 * Calculates the impact of changes to a SO on related entities
 */

import { prisma } from '@/lib/prisma';
import {
  FieldChange,
  ImpactedItem,
  ChangeImpactResult,
  ImpactableEntity,
} from '../types';

export async function calculateSalesOrderImpact(
  soId: string,
  changes: FieldChange[]
): Promise<ChangeImpactResult> {
  // Fetch SO with lines and work orders
  const so = await prisma.salesOrder.findUnique({
    where: { id: soId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      priority: true,
      lines: {
        select: {
          id: true,
          productId: true,
          quantity: true,
          product: {
            select: { sku: true, name: true },
          },
        },
      },
      workOrders: {
        where: { status: { notIn: ['completed', 'cancelled'] } },
        select: { id: true, woNumber: true, status: true, quantity: true },
      },
    },
  });

  if (!so) {
    throw new Error(`Sales Order not found: ${soId}`);
  }

  const impactedItems: ImpactedItem[] = [];

  // Check for status changes
  const statusChange = changes.find(c => c.field === 'status');
  if (statusChange) {
    const newStatus = statusChange.newValue as string;
    const oldStatus = statusChange.oldValue as string;

    // Cancelled → affects work orders and inventory reservations
    if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
      // Impact on work orders
      for (const wo of so.workOrders) {
        impactedItems.push({
          id: wo.id,
          entity: 'workOrder',
          entityCode: wo.woNumber,
          entityName: `${wo.woNumber} (${wo.status}) - Qty: ${wo.quantity}`,
          relationship: 'Work Order - May Need Cancellation',
          changes: [{
            field: 'status',
            fieldLabel: 'Status',
            oldValue: wo.status,
            newValue: 'Review Required',
            valueType: 'string',
          }],
          navigationUrl: `/production/${wo.id}`,
          canNavigate: true,
        });
      }

      // Impact on inventory reservations
      for (const line of so.lines) {
        impactedItems.push({
          id: line.id,
          entity: 'inventory',
          entityCode: line.product.sku,
          entityName: `${line.product.name}`,
          relationship: 'Inventory - Reserved Qty Release',
          changes: [{
            field: 'reserved',
            fieldLabel: 'Reserved Qty',
            oldValue: line.quantity,
            newValue: 0,
            valueType: 'number',
          }],
          navigationUrl: `/inventory?productId=${line.productId}`,
          canNavigate: true,
        });
      }
    }

    // Confirmed → triggers production planning
    if (newStatus === 'confirmed' && oldStatus !== 'confirmed') {
      for (const line of so.lines) {
        impactedItems.push({
          id: line.id,
          entity: 'workOrder',
          entityCode: line.product.sku,
          entityName: `${line.product.name} - Qty: ${line.quantity}`,
          relationship: 'Production - Work Order Creation',
          changes: [{
            field: 'productionPlan',
            fieldLabel: 'Production Plan',
            oldValue: 'Not Planned',
            newValue: 'Pending WO Creation',
            valueType: 'string',
          }],
          navigationUrl: `/production`,
          canNavigate: true,
        });
      }
    }
  }

  // Check for priority changes
  const priorityChange = changes.find(c => c.field === 'priority');
  if (priorityChange && so.workOrders.length > 0) {
    for (const wo of so.workOrders) {
      impactedItems.push({
        id: wo.id,
        entity: 'workOrder',
        entityCode: wo.woNumber,
        entityName: `${wo.woNumber} (${wo.status})`,
        relationship: 'Work Order - Priority Update',
        changes: [{
          field: 'priority',
          fieldLabel: 'Priority',
          oldValue: priorityChange.oldValue,
          newValue: priorityChange.newValue,
          valueType: 'string',
        }],
        navigationUrl: `/production/${wo.id}`,
        canNavigate: true,
      });
    }
  }

  return {
    sourceEntity: 'salesOrder' as ImpactableEntity,
    sourceId: soId,
    sourceCode: so.orderNumber,
    changes,
    impactedItems,
    totalImpactedCount: impactedItems.length,
    calculatedAt: new Date(),
  };
}
