/**
 * Inventory Impact Calculator
 * Calculates the impact of changes to Inventory on related entities
 */

import { prisma } from '@/lib/prisma';
import {
  FieldChange,
  ImpactedItem,
  ChangeImpactResult,
  ImpactableEntity,
} from '../types';

interface InventoryWithRelations {
  id: string;
  partId: string;
  quantity: number;
  part: {
    id: string;
    partNumber: string;
    name: string;
  };
}

export async function calculateInventoryImpact(
  inventoryId: string,
  changes: FieldChange[]
): Promise<ChangeImpactResult> {
  // Fetch inventory with related entities
  const inventory = await prisma.inventory.findUnique({
    where: { id: inventoryId },
    include: {
      part: {
        select: {
          id: true,
          partNumber: true,
          name: true,
        },
      },
    },
  }) as InventoryWithRelations | null;

  if (!inventory) {
    throw new Error(`Inventory not found: ${inventoryId}`);
  }

  const impactedItems: ImpactedItem[] = [];

  // Check for quantity changes
  const quantityChange = changes.find(c => c.field === 'quantity');
  if (quantityChange) {
    const oldQty = Number(quantityChange.oldValue) || 0;
    const newQty = Number(quantityChange.newValue) || 0;

    // Check for work order allocations that might be affected
    const allocations = await prisma.materialAllocation.findMany({
      where: {
        partId: inventory.partId,
        status: { in: ['pending', 'partial'] },
      },
      include: {
        workOrder: {
          select: { id: true, woNumber: true, status: true },
        },
      },
    });

    for (const allocation of allocations) {
      // If quantity is being reduced, it might affect allocations
      if (newQty < oldQty && newQty < allocation.requiredQty) {
        impactedItems.push({
          id: allocation.id,
          entity: 'workOrder',
          entityCode: allocation.workOrder.woNumber,
          entityName: `WO ${allocation.workOrder.woNumber} - Allocation`,
          relationship: 'Material Allocation',
          changes: [{
            field: 'availableStock',
            fieldLabel: 'Available Stock',
            oldValue: oldQty,
            newValue: newQty,
            valueType: 'number',
          }],
          navigationUrl: `/production/${allocation.workOrder.id}`,
          canNavigate: true,
        });
      }
    }
  }

  // Check for planning field changes (these affect the Part)
  const planningFields = ['safetyStock', 'minStockLevel', 'reorderPoint'];
  const planningChanges = changes.filter(c => planningFields.includes(c.field));

  if (planningChanges.length > 0) {
    // These changes affect MRP calculations
    const mrpSuggestions = await prisma.mrpSuggestion.findMany({
      where: {
        partId: inventory.partId,
        status: 'pending',
      },
      select: { id: true, actionType: true, suggestedQty: true },
      take: 5,
    });

    if (mrpSuggestions.length > 0) {
      impactedItems.push({
        id: inventory.partId,
        entity: 'part',
        entityCode: inventory.part.partNumber,
        entityName: `${mrpSuggestions.length} MRP Suggestions`,
        relationship: 'MRP Calculations',
        changes: planningChanges.map(c => ({
          ...c,
          field: 'mrpRecalculation',
          fieldLabel: `${c.fieldLabel} → MRP Recalc`,
        })),
        navigationUrl: `/mrp?partId=${inventory.partId}`,
        canNavigate: true,
      });
    }
  }

  return {
    sourceEntity: 'inventory' as ImpactableEntity,
    sourceId: inventoryId,
    sourceCode: inventory.part.partNumber,
    changes,
    impactedItems,
    totalImpactedCount: impactedItems.length,
    calculatedAt: new Date(),
  };
}
