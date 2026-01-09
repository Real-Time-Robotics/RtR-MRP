/**
 * Part Impact Calculator
 * Calculates the impact of changes to a Part on related entities
 */

import { prisma } from '@/lib/prisma';
import {
  FieldChange,
  ImpactedItem,
  ChangeImpactResult,
  ImpactableEntity,
} from '../types';
import { ENTITY_RELATIONSHIPS, PART_FIELD_IMPACT_RULES } from '../relationships';

interface PartWithRelations {
  id: string;
  partNumber: string;
  name: string;
  unitCost: number | null;
  leadTime: number | null;
  minOrderQty: number | null;
  safetyStock: number | null;
  bomLines: Array<{
    id: string;
    quantity: number;
    bom: {
      id: string;
      bomNumber: string;
      product: {
        name: string;
      };
    };
  }>;
  inventory: Array<{
    id: string;
    quantity: number;
    locationCode: string | null;
  }>;
  poLines: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    po: {
      id: string;
      poNumber: string;
      status: string;
    };
  }>;
}

export async function calculatePartImpact(
  partId: string,
  changes: FieldChange[]
): Promise<ChangeImpactResult> {
  // Fetch part with all related entities
  const part = await prisma.part.findUnique({
    where: { id: partId },
    include: {
      bomLines: {
        include: {
          bom: {
            include: {
              product: {
                select: { name: true },
              },
            },
          },
        },
      },
      inventory: {
        select: {
          id: true,
          quantity: true,
          locationCode: true,
        },
      },
      poLines: {
        where: {
          po: {
            status: { in: ['draft', 'pending', 'approved'] },
          },
        },
        include: {
          po: {
            select: { id: true, poNumber: true, status: true },
          },
        },
      },
    },
  }) as PartWithRelations | null;

  if (!part) {
    throw new Error(`Part not found: ${partId}`);
  }

  const impactedItems: ImpactedItem[] = [];

  // Process each change and calculate impacts
  for (const change of changes) {
    // Find matching impact rules for this field
    const rules = PART_FIELD_IMPACT_RULES.filter(
      (rule) => rule.sourceField === change.field
    );

    for (const rule of rules) {
      switch (rule.targetEntity) {
        case 'bomLine':
          // Calculate impact on BOM Lines
          for (const bomLine of part.bomLines) {
            const impactChange = rule.calculateImpact(
              change.oldValue,
              change.newValue,
              { quantity: bomLine.quantity }
            );

            if (impactChange) {
              const existingItem = impactedItems.find(
                (item) => item.id === bomLine.id && item.entity === 'bomLine'
              );

              if (existingItem) {
                existingItem.changes.push(impactChange);
              } else {
                const relationship = ENTITY_RELATIONSHIPS.part.find(
                  (r) => r.targetEntity === 'bomLine'
                );
                impactedItems.push({
                  id: bomLine.id,
                  entity: 'bomLine',
                  entityCode: bomLine.bom.bomNumber,
                  entityName: `${bomLine.bom.product.name} (Qty: ${bomLine.quantity})`,
                  relationship: relationship?.relationship || 'BOM Line',
                  changes: [impactChange],
                  navigationUrl: `/bom/${bomLine.bom.id}`,
                  canNavigate: true,
                });
              }
            }
          }
          break;

        case 'inventory':
          // Calculate impact on Inventory
          for (const inv of part.inventory) {
            const impactChange = rule.calculateImpact(
              change.oldValue,
              change.newValue,
              { quantity: inv.quantity }
            );

            if (impactChange) {
              const existingItem = impactedItems.find(
                (item) => item.id === inv.id && item.entity === 'inventory'
              );

              if (existingItem) {
                existingItem.changes.push(impactChange);
              } else {
                const relationship = ENTITY_RELATIONSHIPS.part.find(
                  (r) => r.targetEntity === 'inventory'
                );
                impactedItems.push({
                  id: inv.id,
                  entity: 'inventory',
                  entityCode: part.partNumber,
                  entityName: `${inv.locationCode || 'Default'} (Qty: ${inv.quantity})`,
                  relationship: relationship?.relationship || 'Inventory',
                  changes: [impactChange],
                  navigationUrl: `/inventory?partId=${partId}`,
                  canNavigate: true,
                });
              }
            }
          }
          break;

        case 'poLine':
          // Calculate impact on PO Lines
          for (const poLine of part.poLines) {
            const impactChange = rule.calculateImpact(
              change.oldValue,
              change.newValue,
              { quantity: poLine.quantity, currentPrice: poLine.unitPrice }
            );

            if (impactChange) {
              const existingItem = impactedItems.find(
                (item) => item.id === poLine.id && item.entity === 'poLine'
              );

              if (existingItem) {
                existingItem.changes.push(impactChange);
              } else {
                const relationship = ENTITY_RELATIONSHIPS.part.find(
                  (r) => r.targetEntity === 'poLine'
                );
                impactedItems.push({
                  id: poLine.id,
                  entity: 'poLine',
                  entityCode: poLine.po.poNumber,
                  entityName: `PO ${poLine.po.poNumber} (${poLine.po.status})`,
                  relationship: relationship?.relationship || 'PO Line',
                  changes: [impactChange],
                  navigationUrl: `/purchasing/${poLine.po.id}`,
                  canNavigate: true,
                });
              }
            }
          }
          break;
      }
    }
  }

  return {
    sourceEntity: 'part' as ImpactableEntity,
    sourceId: partId,
    sourceCode: part.partNumber,
    changes,
    impactedItems,
    totalImpactedCount: impactedItems.length,
    calculatedAt: new Date(),
  };
}
