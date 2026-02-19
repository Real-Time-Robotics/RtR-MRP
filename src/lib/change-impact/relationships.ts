/**
 * Change Impact Tracking - Entity Relationships
 * Defines how entities are connected and how changes propagate
 */

import { ImpactableEntity, EntityRelationship, FieldImpactRule } from './types';

// Entity relationship map - defines direct relationships
export const ENTITY_RELATIONSHIPS: Record<ImpactableEntity, EntityRelationship[]> = {
  part: [
    {
      sourceEntity: 'part',
      targetEntity: 'bomLine',
      relationship: 'Used in BOM Lines',
      prismaInclude: 'bomLines',
      getNavigationUrl: (targetId) => `/bom?highlight=${targetId}`,
    },
    {
      sourceEntity: 'part',
      targetEntity: 'inventory',
      relationship: 'Inventory Records',
      prismaInclude: 'inventory',
      getNavigationUrl: (targetId) => `/inventory?id=${targetId}`,
    },
    {
      sourceEntity: 'part',
      targetEntity: 'poLine',
      relationship: 'Purchase Order Lines',
      prismaInclude: 'purchaseOrderLines',
      getNavigationUrl: (targetId) => `/purchasing?line=${targetId}`,
    },
    {
      sourceEntity: 'part',
      targetEntity: 'soLine',
      relationship: 'Sales Order Lines',
      prismaInclude: 'salesOrderLines',
      getNavigationUrl: (targetId) => `/orders?line=${targetId}`,
    },
    {
      sourceEntity: 'part',
      targetEntity: 'workOrder',
      relationship: 'Work Orders',
      prismaInclude: 'workOrders',
      getNavigationUrl: (targetId) => `/production/${targetId}`,
    },
  ],
  bom: [
    {
      sourceEntity: 'bom',
      targetEntity: 'bomLine',
      relationship: 'BOM Lines',
      prismaInclude: 'lines',
      getNavigationUrl: (targetId) => `/bom?line=${targetId}`,
    },
    {
      sourceEntity: 'bom',
      targetEntity: 'workOrder',
      relationship: 'Work Orders',
      prismaInclude: 'workOrders',
      getNavigationUrl: (targetId) => `/production/${targetId}`,
    },
  ],
  bomLine: [
    {
      sourceEntity: 'bomLine',
      targetEntity: 'bom',
      relationship: 'Parent BOM',
      prismaInclude: 'bom',
      getNavigationUrl: (targetId) => `/bom/${targetId}`,
    },
  ],
  inventory: [
    {
      sourceEntity: 'inventory',
      targetEntity: 'part',
      relationship: 'Part',
      prismaInclude: 'part',
      getNavigationUrl: (targetId) => `/parts/${targetId}`,
    },
  ],
  workOrder: [
    {
      sourceEntity: 'workOrder',
      targetEntity: 'part',
      relationship: 'Product',
      prismaInclude: 'product',
      getNavigationUrl: (targetId) => `/parts/${targetId}`,
    },
    {
      sourceEntity: 'workOrder',
      targetEntity: 'salesOrder',
      relationship: 'Sales Order',
      prismaInclude: 'salesOrder',
      getNavigationUrl: (targetId) => `/orders/${targetId}`,
    },
  ],
  purchaseOrder: [
    {
      sourceEntity: 'purchaseOrder',
      targetEntity: 'poLine',
      relationship: 'PO Lines',
      prismaInclude: 'lines',
      getNavigationUrl: (targetId) => `/purchasing?line=${targetId}`,
    },
    {
      sourceEntity: 'purchaseOrder',
      targetEntity: 'supplier',
      relationship: 'Supplier',
      prismaInclude: 'supplier',
      getNavigationUrl: (targetId) => `/suppliers/${targetId}`,
    },
  ],
  poLine: [
    {
      sourceEntity: 'poLine',
      targetEntity: 'purchaseOrder',
      relationship: 'Purchase Order',
      prismaInclude: 'purchaseOrder',
      getNavigationUrl: (targetId) => `/purchasing/${targetId}`,
    },
    {
      sourceEntity: 'poLine',
      targetEntity: 'part',
      relationship: 'Part',
      prismaInclude: 'part',
      getNavigationUrl: (targetId) => `/parts/${targetId}`,
    },
  ],
  salesOrder: [
    {
      sourceEntity: 'salesOrder',
      targetEntity: 'soLine',
      relationship: 'SO Lines',
      prismaInclude: 'lines',
      getNavigationUrl: (targetId) => `/orders?line=${targetId}`,
    },
    {
      sourceEntity: 'salesOrder',
      targetEntity: 'customer',
      relationship: 'Customer',
      prismaInclude: 'customer',
      getNavigationUrl: (targetId) => `/customers/${targetId}`,
    },
    {
      sourceEntity: 'salesOrder',
      targetEntity: 'workOrder',
      relationship: 'Work Orders',
      prismaInclude: 'workOrders',
      getNavigationUrl: (targetId) => `/production/${targetId}`,
    },
  ],
  soLine: [
    {
      sourceEntity: 'soLine',
      targetEntity: 'salesOrder',
      relationship: 'Sales Order',
      prismaInclude: 'salesOrder',
      getNavigationUrl: (targetId) => `/orders/${targetId}`,
    },
    {
      sourceEntity: 'soLine',
      targetEntity: 'part',
      relationship: 'Part',
      prismaInclude: 'part',
      getNavigationUrl: (targetId) => `/parts/${targetId}`,
    },
  ],
  supplier: [
    {
      sourceEntity: 'supplier',
      targetEntity: 'purchaseOrder',
      relationship: 'Purchase Orders',
      prismaInclude: 'purchaseOrders',
      getNavigationUrl: (targetId) => `/purchasing/${targetId}`,
    },
    {
      sourceEntity: 'supplier',
      targetEntity: 'part',
      relationship: 'Supplied Parts',
      prismaInclude: 'parts',
      getNavigationUrl: (targetId) => `/parts/${targetId}`,
    },
  ],
  customer: [
    {
      sourceEntity: 'customer',
      targetEntity: 'salesOrder',
      relationship: 'Sales Orders',
      prismaInclude: 'salesOrders',
      getNavigationUrl: (targetId) => `/orders/${targetId}`,
    },
  ],
};

// Field impact rules for Part entity
export const PART_FIELD_IMPACT_RULES: FieldImpactRule[] = [
  // Unit Cost impacts BOM Lines, Inventory, PO Lines
  {
    sourceField: 'unitCost',
    sourceFieldLabel: 'Unit Cost',
    targetEntity: 'bomLine',
    targetField: 'lineCost',
    targetFieldLabel: 'Line Cost',
    valueType: 'currency',
    calculateImpact: (oldValue, newValue, context) => {
      const qty = (context as Record<string, unknown>).quantity as number;
      const oldCost = (oldValue as number) * qty;
      const newCost = (newValue as number) * qty;
      if (oldCost === newCost) return null;
      return {
        field: 'lineCost',
        fieldLabel: 'Line Cost',
        oldValue: oldCost,
        newValue: newCost,
        valueType: 'currency',
      };
    },
  },
  {
    sourceField: 'unitCost',
    sourceFieldLabel: 'Unit Cost',
    targetEntity: 'inventory',
    targetField: 'totalValue',
    targetFieldLabel: 'Total Value',
    valueType: 'currency',
    calculateImpact: (oldValue, newValue, context) => {
      const qty = (context as Record<string, unknown>).quantity as number;
      const oldTotal = (oldValue as number) * qty;
      const newTotal = (newValue as number) * qty;
      if (oldTotal === newTotal) return null;
      return {
        field: 'totalValue',
        fieldLabel: 'Total Value',
        oldValue: oldTotal,
        newValue: newTotal,
        valueType: 'currency',
      };
    },
  },
  {
    sourceField: 'unitCost',
    sourceFieldLabel: 'Unit Cost',
    targetEntity: 'poLine',
    targetField: 'unitPrice',
    targetFieldLabel: 'Unit Price (Reference)',
    valueType: 'currency',
    calculateImpact: (oldValue, newValue) => {
      if (oldValue === newValue) return null;
      return {
        field: 'unitPrice',
        fieldLabel: 'Unit Price (Reference)',
        oldValue,
        newValue,
        valueType: 'currency',
      };
    },
  },
  // Lead Time impacts PO scheduling
  {
    sourceField: 'leadTime',
    sourceFieldLabel: 'Lead Time',
    targetEntity: 'poLine',
    targetField: 'expectedDate',
    targetFieldLabel: 'Expected Date',
    valueType: 'date',
    calculateImpact: (oldValue, newValue) => {
      if (oldValue === newValue) return null;
      return {
        field: 'expectedDate',
        fieldLabel: 'Expected Date',
        oldValue: `+${oldValue} days`,
        newValue: `+${newValue} days`,
        valueType: 'string',
      };
    },
  },
  // Min Order Qty impacts PO recommendations
  {
    sourceField: 'minOrderQty',
    sourceFieldLabel: 'Min Order Qty',
    targetEntity: 'poLine',
    targetField: 'minQty',
    targetFieldLabel: 'Minimum Qty',
    valueType: 'number',
    calculateImpact: (oldValue, newValue) => {
      if (oldValue === newValue) return null;
      return {
        field: 'minQty',
        fieldLabel: 'Minimum Qty',
        oldValue,
        newValue,
        valueType: 'number',
      };
    },
  },
  // Safety Stock impacts MRP calculations
  {
    sourceField: 'safetyStock',
    sourceFieldLabel: 'Safety Stock',
    targetEntity: 'inventory',
    targetField: 'safetyLevel',
    targetFieldLabel: 'Safety Level',
    valueType: 'number',
    calculateImpact: (oldValue, newValue) => {
      if (oldValue === newValue) return null;
      return {
        field: 'safetyLevel',
        fieldLabel: 'Safety Level',
        oldValue,
        newValue,
        valueType: 'number',
      };
    },
  },
];

// Field impact rules for BOM entity
export const BOM_FIELD_IMPACT_RULES: FieldImpactRule[] = [
  {
    sourceField: 'version',
    sourceFieldLabel: 'Version',
    targetEntity: 'workOrder',
    targetField: 'bomVersion',
    targetFieldLabel: 'BOM Version',
    valueType: 'string',
    calculateImpact: (oldValue, newValue) => {
      if (oldValue === newValue) return null;
      return {
        field: 'bomVersion',
        fieldLabel: 'BOM Version',
        oldValue,
        newValue,
        valueType: 'string',
      };
    },
  },
];

// Get relationships for an entity
export function getEntityRelationships(entity: ImpactableEntity): EntityRelationship[] {
  return ENTITY_RELATIONSHIPS[entity] || [];
}

// Get field impact rules for an entity
export function getFieldImpactRules(entity: ImpactableEntity): FieldImpactRule[] {
  switch (entity) {
    case 'part':
      return PART_FIELD_IMPACT_RULES;
    case 'bom':
      return BOM_FIELD_IMPACT_RULES;
    default:
      return [];
  }
}
