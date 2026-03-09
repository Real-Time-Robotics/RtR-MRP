import { describe, it, expect } from 'vitest';
import {
  SCHEDULED_REPORT_TEMPLATES,
  getReportTemplate,
  getScheduledTemplatesByCategory,
  getTemplateCategories,
} from '../report-templates';

describe('report-templates', () => {
  describe('SCHEDULED_REPORT_TEMPLATES', () => {
    it('should contain at least 6 templates', () => {
      expect(SCHEDULED_REPORT_TEMPLATES.length).toBeGreaterThanOrEqual(6);
    });

    it('every template should have required fields', () => {
      for (const t of SCHEDULED_REPORT_TEMPLATES) {
        expect(t.id).toBeTruthy();
        expect(t.name).toBeTruthy();
        expect(t.nameVi).toBeTruthy();
        expect(t.description).toBeTruthy();
        expect(t.descriptionVi).toBeTruthy();
        expect(t.icon).toBeTruthy();
        expect(t.category).toBeTruthy();
        expect(t.columns.length).toBeGreaterThan(0);
        expect(t.defaultFrequency).toBeTruthy();
        expect(t.defaultTime).toBeTruthy();
        expect(t.query).toBeTruthy();
      }
    });

    it('each column should have key, label, labelVi, and type', () => {
      for (const t of SCHEDULED_REPORT_TEMPLATES) {
        for (const col of t.columns) {
          expect(col.key).toBeTruthy();
          expect(col.label).toBeTruthy();
          expect(col.labelVi).toBeTruthy();
          expect(['string', 'number', 'date', 'currency', 'percent']).toContain(col.type);
        }
      }
    });

    it('each template id should be unique', () => {
      const ids = SCHEDULED_REPORT_TEMPLATES.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('getReportTemplate', () => {
    it('should return a template by id', () => {
      const template = getReportTemplate('inventory-summary');
      expect(template).toBeDefined();
      expect(template!.id).toBe('inventory-summary');
      expect(template!.nameVi).toBe('Báo cáo Tồn kho');
    });

    it('should return undefined for unknown id', () => {
      expect(getReportTemplate('does-not-exist')).toBeUndefined();
    });

    it('should return correct template for each known id', () => {
      const knownIds = ['inventory-summary', 'po-summary', 'production-status', 'supplier-performance', 'low-stock-alert', 'quality-report'];
      for (const id of knownIds) {
        const t = getReportTemplate(id);
        expect(t).toBeDefined();
        expect(t!.id).toBe(id);
      }
    });
  });

  describe('getScheduledTemplatesByCategory', () => {
    it('should return inventory templates', () => {
      const result = getScheduledTemplatesByCategory('inventory');
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.every((t) => t.category === 'inventory')).toBe(true);
    });

    it('should return empty array for unknown category', () => {
      expect(getScheduledTemplatesByCategory('nonexistent')).toEqual([]);
    });

    it('should return production templates', () => {
      const result = getScheduledTemplatesByCategory('production');
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.every((t) => t.category === 'production')).toBe(true);
    });
  });

  describe('getTemplateCategories', () => {
    it('should return unique categories', () => {
      const categories = getTemplateCategories();
      expect(categories.length).toBeGreaterThanOrEqual(4);
      expect(new Set(categories).size).toBe(categories.length);
    });

    it('should include inventory and production', () => {
      const categories = getTemplateCategories();
      expect(categories).toContain('inventory');
      expect(categories).toContain('production');
    });
  });
});
