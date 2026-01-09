/**
 * Supplier Impact Calculator
 * Calculates the impact of changes to a Supplier on related entities
 */

import { prisma } from '@/lib/prisma';
import {
  FieldChange,
  ImpactedItem,
  ChangeImpactResult,
  ImpactableEntity,
} from '../types';

interface SupplierWithRelations {
  id: string;
  code: string;
  name: string;
  leadTimeDays: number;
}

export async function calculateSupplierImpact(
  supplierId: string,
  changes: FieldChange[]
): Promise<ChangeImpactResult> {
  // Fetch supplier
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: {
      id: true,
      code: true,
      name: true,
      leadTimeDays: true,
    },
  }) as SupplierWithRelations | null;

  if (!supplier) {
    throw new Error(`Supplier not found: ${supplierId}`);
  }

  const impactedItems: ImpactedItem[] = [];

  // Check for lead time changes
  const leadTimeChange = changes.find(c => c.field === 'leadTimeDays');
  if (leadTimeChange) {
    // Get active purchase orders for this supplier
    const activePOs = await prisma.purchaseOrder.findMany({
      where: {
        supplierId,
        status: { in: ['draft', 'pending', 'approved'] },
      },
      select: { id: true, poNumber: true, status: true },
      take: 10,
    });

    for (const po of activePOs) {
      impactedItems.push({
        id: po.id,
        entity: 'purchaseOrder',
        entityCode: po.poNumber,
        entityName: `PO ${po.poNumber} (${po.status})`,
        relationship: 'Purchase Order - Expected Delivery',
        changes: [{
          field: 'expectedDelivery',
          fieldLabel: 'Expected Delivery',
          oldValue: `+${leadTimeChange.oldValue} days`,
          newValue: `+${leadTimeChange.newValue} days`,
          valueType: 'string',
        }],
        navigationUrl: `/purchasing/${po.id}`,
        canNavigate: true,
      });
    }

    // Get parts supplied by this supplier
    const suppliedParts = await prisma.partSupplier.findMany({
      where: {
        supplierId,
        isPreferred: true,
      },
      include: {
        part: {
          select: { id: true, partNumber: true, name: true },
        },
      },
      take: 10,
    });

    if (suppliedParts.length > 0) {
      impactedItems.push({
        id: supplierId,
        entity: 'part',
        entityCode: supplier.code,
        entityName: `${suppliedParts.length} Part(s) - Preferred Supplier`,
        relationship: 'Parts - Default Lead Time',
        changes: [{
          field: 'defaultLeadTime',
          fieldLabel: 'Default Lead Time',
          oldValue: leadTimeChange.oldValue,
          newValue: leadTimeChange.newValue,
          valueType: 'number',
        }],
        navigationUrl: `/parts?supplierId=${supplierId}`,
        canNavigate: true,
      });
    }
  }

  // Check for status changes
  const statusChange = changes.find(c => c.field === 'status');
  if (statusChange && statusChange.newValue === 'inactive') {
    // Get active POs that will be affected
    const activePOs = await prisma.purchaseOrder.findMany({
      where: {
        supplierId,
        status: { in: ['draft', 'pending', 'approved', 'confirmed'] },
      },
      select: { id: true, poNumber: true, status: true },
    });

    if (activePOs.length > 0) {
      impactedItems.push({
        id: supplierId,
        entity: 'purchaseOrder',
        entityCode: supplier.code,
        entityName: `${activePOs.length} Active PO(s)`,
        relationship: 'Purchase Orders - Supplier Inactive',
        changes: [{
          field: 'supplierStatus',
          fieldLabel: 'Supplier Status',
          oldValue: 'Active',
          newValue: 'Inactive',
          valueType: 'string',
        }],
        navigationUrl: `/purchasing?supplierId=${supplierId}`,
        canNavigate: true,
      });
    }
  }

  return {
    sourceEntity: 'supplier' as ImpactableEntity,
    sourceId: supplierId,
    sourceCode: supplier.code,
    changes,
    impactedItems,
    totalImpactedCount: impactedItems.length,
    calculatedAt: new Date(),
  };
}
