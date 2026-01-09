/**
 * BOM Impact Calculator
 * Calculates the impact of changes to a BOM on related entities
 */

import { prisma } from '@/lib/prisma';
import {
  FieldChange,
  ImpactedItem,
  ChangeImpactResult,
  ImpactableEntity,
} from '../types';
import { ENTITY_RELATIONSHIPS, BOM_FIELD_IMPACT_RULES } from '../relationships';

interface BOMWithRelations {
  id: string;
  bomNumber: string;
  version: string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
  bomLines: Array<{
    id: string;
    quantity: number;
    part: {
      id: string;
      partNumber: string;
      name: string;
    };
  }>;
}

export async function calculateBOMImpact(
  bomId: string,
  changes: FieldChange[]
): Promise<ChangeImpactResult> {
  // Fetch BOM with all related entities
  const bom = await prisma.bomHeader.findUnique({
    where: { id: bomId },
    include: {
      product: {
        select: { id: true, name: true, sku: true },
      },
      bomLines: {
        include: {
          part: {
            select: { id: true, partNumber: true, name: true },
          },
        },
      },
    },
  }) as BOMWithRelations | null;

  if (!bom) {
    throw new Error(`BOM not found: ${bomId}`);
  }

  // Fetch related work orders through product
  const workOrders = await prisma.workOrder.findMany({
    where: {
      productId: bom.product.id,
      status: { in: ['draft', 'released', 'in_progress'] },
    },
    select: { id: true, woNumber: true, status: true, quantity: true },
  });

  const impactedItems: ImpactedItem[] = [];

  // Process each change and calculate impacts
  for (const change of changes) {
    // Find matching impact rules for this field
    const rules = BOM_FIELD_IMPACT_RULES.filter(
      (rule) => rule.sourceField === change.field
    );

    for (const rule of rules) {
      switch (rule.targetEntity) {
        case 'workOrder':
          // Calculate impact on Work Orders
          for (const wo of workOrders) {
            const impactChange = rule.calculateImpact(
              change.oldValue,
              change.newValue,
              { quantity: wo.quantity }
            );

            if (impactChange) {
              const existingItem = impactedItems.find(
                (item) => item.id === wo.id && item.entity === 'workOrder'
              );

              if (existingItem) {
                existingItem.changes.push(impactChange);
              } else {
                const relationship = ENTITY_RELATIONSHIPS.bom.find(
                  (r) => r.targetEntity === 'workOrder'
                );
                impactedItems.push({
                  id: wo.id,
                  entity: 'workOrder',
                  entityCode: wo.woNumber,
                  entityName: `${wo.woNumber} (${wo.status}) - Qty: ${wo.quantity}`,
                  relationship: relationship?.relationship || 'Work Order',
                  changes: [impactChange],
                  navigationUrl: `/production/${wo.id}`,
                  canNavigate: true,
                });
              }
            }
          }
          break;

        case 'bomLine':
          // Calculate impact on BOM Lines (for line quantity changes)
          for (const line of bom.bomLines) {
            const impactChange = rule.calculateImpact(
              change.oldValue,
              change.newValue,
              { part: line.part }
            );

            if (impactChange) {
              const existingItem = impactedItems.find(
                (item) => item.id === line.id && item.entity === 'bomLine'
              );

              if (existingItem) {
                existingItem.changes.push(impactChange);
              } else {
                impactedItems.push({
                  id: line.id,
                  entity: 'bomLine',
                  entityCode: line.part.partNumber,
                  entityName: `${line.part.name} (Qty: ${line.quantity})`,
                  relationship: 'BOM Line',
                  changes: [impactChange],
                  navigationUrl: `/parts/${line.part.id}`,
                  canNavigate: true,
                });
              }
            }
          }
          break;
      }
    }
  }

  // Special handling for BOM line changes (adding/removing lines)
  const lineChanges = changes.filter(c => c.field === 'lines');
  for (const lineChange of lineChanges) {
    // Impact all related work orders
    for (const wo of workOrders) {
      const existingItem = impactedItems.find(
        (item) => item.id === wo.id && item.entity === 'workOrder'
      );

      const bomLineChange: FieldChange = {
        field: 'materialRequirements',
        fieldLabel: 'Material Requirements',
        oldValue: 'Current',
        newValue: 'Updated',
        valueType: 'string',
      };

      if (existingItem) {
        existingItem.changes.push(bomLineChange);
      } else {
        impactedItems.push({
          id: wo.id,
          entity: 'workOrder',
          entityCode: wo.woNumber,
          entityName: `${wo.woNumber} (${wo.status}) - Qty: ${wo.quantity}`,
          relationship: 'Work Order - Material Requirements',
          changes: [bomLineChange],
          navigationUrl: `/production/${wo.id}`,
          canNavigate: true,
        });
      }
    }
  }

  return {
    sourceEntity: 'bom' as ImpactableEntity,
    sourceId: bomId,
    sourceCode: bom.bomNumber,
    changes,
    impactedItems,
    totalImpactedCount: impactedItems.length,
    calculatedAt: new Date(),
  };
}
