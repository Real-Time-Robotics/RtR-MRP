// src/lib/change-impact/__tests__/relationships.test.ts
// Unit tests for entity relationships and field impact rules

import { describe, it, expect } from 'vitest';
import {
  ENTITY_RELATIONSHIPS,
  PART_FIELD_IMPACT_RULES,
  BOM_FIELD_IMPACT_RULES,
  getEntityRelationships,
  getFieldImpactRules,
} from '../relationships';
import type { ImpactableEntity } from '../types';

describe('Change Impact Relationships', () => {
  // ==========================================================================
  // ENTITY_RELATIONSHIPS
  // ==========================================================================
  describe('ENTITY_RELATIONSHIPS', () => {
    it('should define relationships for all entity types', () => {
      const entities: ImpactableEntity[] = [
        'part', 'bom', 'bomLine', 'inventory', 'workOrder',
        'purchaseOrder', 'poLine', 'salesOrder', 'soLine',
        'supplier', 'customer',
      ];

      for (const entity of entities) {
        expect(ENTITY_RELATIONSHIPS[entity]).toBeDefined();
        expect(Array.isArray(ENTITY_RELATIONSHIPS[entity])).toBe(true);
      }
    });

    it('should have correct structure for part relationships', () => {
      const partRelations = ENTITY_RELATIONSHIPS.part;
      expect(partRelations.length).toBe(5);

      for (const rel of partRelations) {
        expect(rel.sourceEntity).toBe('part');
        expect(rel.targetEntity).toBeDefined();
        expect(rel.relationship).toBeDefined();
        expect(rel.prismaInclude).toBeDefined();
        expect(typeof rel.getNavigationUrl).toBe('function');
      }
    });

    it('should generate correct navigation URLs for part relationships', () => {
      const partRelations = ENTITY_RELATIONSHIPS.part;

      const bomLineRel = partRelations.find(r => r.targetEntity === 'bomLine');
      expect(bomLineRel!.getNavigationUrl('abc')).toBe('/bom?highlight=abc');

      const inventoryRel = partRelations.find(r => r.targetEntity === 'inventory');
      expect(inventoryRel!.getNavigationUrl('inv-1')).toBe('/inventory?id=inv-1');

      const workOrderRel = partRelations.find(r => r.targetEntity === 'workOrder');
      expect(workOrderRel!.getNavigationUrl('wo-1')).toBe('/production/wo-1');
    });

    it('should generate correct navigation URLs for bom relationships', () => {
      const bomRelations = ENTITY_RELATIONSHIPS.bom;
      expect(bomRelations.length).toBe(2);

      const bomLineRel = bomRelations.find(r => r.targetEntity === 'bomLine');
      expect(bomLineRel!.getNavigationUrl('line-1')).toBe('/bom?line=line-1');
    });

    it('should generate correct navigation URLs for salesOrder relationships', () => {
      const soRelations = ENTITY_RELATIONSHIPS.salesOrder;
      expect(soRelations.length).toBe(3);

      const customerRel = soRelations.find(r => r.targetEntity === 'customer');
      expect(customerRel!.getNavigationUrl('cust-1')).toBe('/customers/cust-1');
    });

    it('should have relationships for purchaseOrder', () => {
      const poRelations = ENTITY_RELATIONSHIPS.purchaseOrder;
      expect(poRelations.length).toBe(2);
      expect(poRelations.map(r => r.targetEntity)).toContain('poLine');
      expect(poRelations.map(r => r.targetEntity)).toContain('supplier');
    });

    it('should have customer -> salesOrder relationship', () => {
      const customerRelations = ENTITY_RELATIONSHIPS.customer;
      expect(customerRelations.length).toBe(1);
      expect(customerRelations[0].targetEntity).toBe('salesOrder');
    });
  });

  // ==========================================================================
  // getEntityRelationships
  // ==========================================================================
  describe('getEntityRelationships', () => {
    it('should return relationships for known entity', () => {
      const result = getEntityRelationships('part');
      expect(result.length).toBe(5);
    });

    it('should return empty array for entity without relationships', () => {
      // All entities have relationships defined, but test the fallback
      const result = getEntityRelationships('unknownEntity' as ImpactableEntity);
      expect(result).toEqual([]);
    });

    it('should return relationships for each entity type', () => {
      expect(getEntityRelationships('bom').length).toBe(2);
      expect(getEntityRelationships('bomLine').length).toBe(1);
      expect(getEntityRelationships('inventory').length).toBe(1);
      expect(getEntityRelationships('workOrder').length).toBe(2);
      expect(getEntityRelationships('supplier').length).toBe(2);
    });
  });

  // ==========================================================================
  // PART_FIELD_IMPACT_RULES
  // ==========================================================================
  describe('PART_FIELD_IMPACT_RULES', () => {
    it('should have rules for unitCost, leadTime, minOrderQty, safetyStock', () => {
      const fields = PART_FIELD_IMPACT_RULES.map(r => r.sourceField);
      expect(fields).toContain('unitCost');
      expect(fields).toContain('leadTime');
      expect(fields).toContain('minOrderQty');
      expect(fields).toContain('safetyStock');
    });

    it('unitCost -> bomLine should calculate line cost impact', () => {
      const rule = PART_FIELD_IMPACT_RULES.find(
        r => r.sourceField === 'unitCost' && r.targetEntity === 'bomLine'
      )!;

      const result = rule.calculateImpact(10, 15, { quantity: 5 });

      expect(result).toEqual({
        field: 'lineCost',
        fieldLabel: 'Line Cost',
        oldValue: 50,
        newValue: 75,
        valueType: 'currency',
      });
    });

    it('unitCost -> bomLine should return null when no change', () => {
      const rule = PART_FIELD_IMPACT_RULES.find(
        r => r.sourceField === 'unitCost' && r.targetEntity === 'bomLine'
      )!;

      const result = rule.calculateImpact(10, 10, { quantity: 5 });
      expect(result).toBeNull();
    });

    it('unitCost -> inventory should calculate total value impact', () => {
      const rule = PART_FIELD_IMPACT_RULES.find(
        r => r.sourceField === 'unitCost' && r.targetEntity === 'inventory'
      )!;

      const result = rule.calculateImpact(100, 120, { quantity: 10 });

      expect(result).toEqual({
        field: 'totalValue',
        fieldLabel: 'Total Value',
        oldValue: 1000,
        newValue: 1200,
        valueType: 'currency',
      });
    });

    it('unitCost -> inventory should return null when values equal', () => {
      const rule = PART_FIELD_IMPACT_RULES.find(
        r => r.sourceField === 'unitCost' && r.targetEntity === 'inventory'
      )!;

      const result = rule.calculateImpact(100, 100, { quantity: 10 });
      expect(result).toBeNull();
    });

    it('unitCost -> poLine should return reference price impact', () => {
      const rule = PART_FIELD_IMPACT_RULES.find(
        r => r.sourceField === 'unitCost' && r.targetEntity === 'poLine'
      )!;

      const result = rule.calculateImpact(50, 55, {});

      expect(result).toEqual({
        field: 'unitPrice',
        fieldLabel: 'Unit Price (Reference)',
        oldValue: 50,
        newValue: 55,
        valueType: 'currency',
      });
    });

    it('unitCost -> poLine should return null when no change', () => {
      const rule = PART_FIELD_IMPACT_RULES.find(
        r => r.sourceField === 'unitCost' && r.targetEntity === 'poLine'
      )!;

      const result = rule.calculateImpact(50, 50, {});
      expect(result).toBeNull();
    });

    it('leadTime -> poLine should return expected date impact', () => {
      const rule = PART_FIELD_IMPACT_RULES.find(
        r => r.sourceField === 'leadTime'
      )!;

      const result = rule.calculateImpact(7, 14, {});

      expect(result).toEqual({
        field: 'expectedDate',
        fieldLabel: 'Expected Date',
        oldValue: '+7 days',
        newValue: '+14 days',
        valueType: 'string',
      });
    });

    it('leadTime should return null when no change', () => {
      const rule = PART_FIELD_IMPACT_RULES.find(
        r => r.sourceField === 'leadTime'
      )!;

      const result = rule.calculateImpact(7, 7, {});
      expect(result).toBeNull();
    });

    it('minOrderQty should calculate impact', () => {
      const rule = PART_FIELD_IMPACT_RULES.find(
        r => r.sourceField === 'minOrderQty'
      )!;

      const result = rule.calculateImpact(100, 200, {});

      expect(result).toEqual({
        field: 'minQty',
        fieldLabel: 'Minimum Qty',
        oldValue: 100,
        newValue: 200,
        valueType: 'number',
      });
    });

    it('safetyStock should calculate impact', () => {
      const rule = PART_FIELD_IMPACT_RULES.find(
        r => r.sourceField === 'safetyStock'
      )!;

      const result = rule.calculateImpact(50, 100, {});

      expect(result).toEqual({
        field: 'safetyLevel',
        fieldLabel: 'Safety Level',
        oldValue: 50,
        newValue: 100,
        valueType: 'number',
      });
    });

    it('safetyStock should return null when no change', () => {
      const rule = PART_FIELD_IMPACT_RULES.find(
        r => r.sourceField === 'safetyStock'
      )!;

      const result = rule.calculateImpact(50, 50, {});
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // BOM_FIELD_IMPACT_RULES
  // ==========================================================================
  describe('BOM_FIELD_IMPACT_RULES', () => {
    it('should have version field rule', () => {
      expect(BOM_FIELD_IMPACT_RULES.length).toBe(1);
      expect(BOM_FIELD_IMPACT_RULES[0].sourceField).toBe('version');
    });

    it('version should calculate impact on work order', () => {
      const rule = BOM_FIELD_IMPACT_RULES[0];

      const result = rule.calculateImpact('1.0', '2.0', {});

      expect(result).toEqual({
        field: 'bomVersion',
        fieldLabel: 'BOM Version',
        oldValue: '1.0',
        newValue: '2.0',
        valueType: 'string',
      });
    });

    it('version should return null when no change', () => {
      const rule = BOM_FIELD_IMPACT_RULES[0];
      const result = rule.calculateImpact('1.0', '1.0', {});
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // getFieldImpactRules
  // ==========================================================================
  describe('getFieldImpactRules', () => {
    it('should return part rules for part entity', () => {
      const rules = getFieldImpactRules('part');
      expect(rules).toBe(PART_FIELD_IMPACT_RULES);
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should return bom rules for bom entity', () => {
      const rules = getFieldImpactRules('bom');
      expect(rules).toBe(BOM_FIELD_IMPACT_RULES);
    });

    it('should return empty array for entities without rules', () => {
      expect(getFieldImpactRules('inventory')).toEqual([]);
      expect(getFieldImpactRules('workOrder')).toEqual([]);
      expect(getFieldImpactRules('customer')).toEqual([]);
    });
  });
});
