import { describe, it, expect } from 'vitest';
import {
  REPORT_TEMPLATES,
  PERIOD_OPTIONS,
  CATEGORY_CONFIG,
  generateReportId,
  getTemplate,
  getTemplatesByCategory,
  getPeriodDates,
  formatValue,
  calculateChange,
  generateInsights,
  generateMockReportData,
} from '../report-engine';
import type { ReportMetric, ReportTemplate } from '../report-engine';

describe('report-engine', () => {
  describe('REPORT_TEMPLATES', () => {
    it('should contain at least 7 templates', () => {
      expect(REPORT_TEMPLATES.length).toBeGreaterThanOrEqual(7);
    });

    it('each template should have required fields', () => {
      for (const t of REPORT_TEMPLATES) {
        expect(t.type).toBeTruthy();
        expect(t.name).toBeTruthy();
        expect(t.nameVi).toBeTruthy();
        expect(t.category).toBeTruthy();
        expect(t.icon).toBeTruthy();
        expect(t.metrics.length).toBeGreaterThan(0);
        expect(t.charts.length).toBeGreaterThan(0);
      }
    });
  });

  describe('PERIOD_OPTIONS', () => {
    it('should contain all period options', () => {
      const values = PERIOD_OPTIONS.map((p) => p.value);
      expect(values).toContain('TODAY');
      expect(values).toContain('THIS_WEEK');
      expect(values).toContain('THIS_MONTH');
      expect(values).toContain('CUSTOM');
    });
  });

  describe('CATEGORY_CONFIG', () => {
    it('should have config for all categories', () => {
      expect(CATEGORY_CONFIG.PRODUCTION).toBeDefined();
      expect(CATEGORY_CONFIG.INVENTORY).toBeDefined();
      expect(CATEGORY_CONFIG.QUALITY).toBeDefined();
      expect(CATEGORY_CONFIG.MAINTENANCE).toBeDefined();
      expect(CATEGORY_CONFIG.PLANNING).toBeDefined();
      expect(CATEGORY_CONFIG.SALES).toBeDefined();
    });

    it('each config should have label, labelVi, color, bgColor', () => {
      for (const key of Object.keys(CATEGORY_CONFIG) as Array<keyof typeof CATEGORY_CONFIG>) {
        const cfg = CATEGORY_CONFIG[key];
        expect(cfg.label).toBeTruthy();
        expect(cfg.labelVi).toBeTruthy();
        expect(cfg.color).toBeTruthy();
        expect(cfg.bgColor).toBeTruthy();
      }
    });
  });

  describe('generateReportId', () => {
    it('should return a string starting with RPT-', () => {
      const id = generateReportId();
      expect(id).toMatch(/^RPT-/);
    });

    it('should generate unique ids', () => {
      const ids = new Set(Array.from({ length: 10 }, () => generateReportId()));
      expect(ids.size).toBe(10);
    });
  });

  describe('getTemplate', () => {
    it('should return a template by type', () => {
      const t = getTemplate('PRODUCTION_SUMMARY');
      expect(t).toBeDefined();
      expect(t!.type).toBe('PRODUCTION_SUMMARY');
    });

    it('should return undefined for unknown type', () => {
      expect(getTemplate('NONEXISTENT' as any)).toBeUndefined();
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should return production templates', () => {
      const result = getTemplatesByCategory('PRODUCTION');
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.every((t) => t.category === 'PRODUCTION')).toBe(true);
    });

    it('should return empty for unknown category', () => {
      expect(getTemplatesByCategory('UNKNOWN' as any)).toEqual([]);
    });
  });

  describe('getPeriodDates', () => {
    it('should return dates for TODAY', () => {
      const result = getPeriodDates('TODAY');
      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeInstanceOf(Date);
      expect(result.label).toBe('Today');
      expect(result.labelVi).toBe('Hôm nay');
    });

    it('should return dates for YESTERDAY', () => {
      const result = getPeriodDates('YESTERDAY');
      expect(result.startDate.getTime()).toBeLessThan(result.endDate.getTime());
      expect(result.labelVi).toBe('Hôm qua');
    });

    it('should return dates for THIS_WEEK', () => {
      const result = getPeriodDates('THIS_WEEK');
      expect(result.labelVi).toBe('Tuần này');
    });

    it('should return dates for LAST_WEEK', () => {
      const result = getPeriodDates('LAST_WEEK');
      expect(result.labelVi).toBe('Tuần trước');
    });

    it('should return dates for THIS_MONTH', () => {
      const result = getPeriodDates('THIS_MONTH');
      expect(result.startDate.getDate()).toBe(1);
      expect(result.labelVi).toBe('Tháng này');
    });

    it('should return dates for LAST_MONTH', () => {
      const result = getPeriodDates('LAST_MONTH');
      expect(result.labelVi).toBe('Tháng trước');
    });

    it('should return dates for THIS_QUARTER', () => {
      const result = getPeriodDates('THIS_QUARTER');
      expect(result.labelVi).toMatch(/Quý \d/);
    });

    it('should return dates for THIS_YEAR', () => {
      const result = getPeriodDates('THIS_YEAR');
      expect(result.startDate.getMonth()).toBe(0);
      expect(result.startDate.getDate()).toBe(1);
    });

    it('should handle CUSTOM with provided dates', () => {
      const result = getPeriodDates('CUSTOM', '2025-01-01', '2025-06-30');
      expect(result.startDate.getFullYear()).toBe(2025);
    });

    it('should handle CUSTOM without dates', () => {
      const result = getPeriodDates('CUSTOM');
      expect(result.startDate).toBeInstanceOf(Date);
    });
  });

  describe('formatValue', () => {
    it('should format percent', () => {
      expect(formatValue(82.5, 'percent')).toBe('82.5%');
    });

    it('should format currency in VND', () => {
      const result = formatValue(1000000, 'currency');
      // Vietnamese locale may use ₫ symbol or VND
      expect(result).toMatch(/₫|VND/);
    });

    it('should format duration with hours and minutes', () => {
      expect(formatValue(125, 'duration')).toBe('2h 5m');
    });

    it('should format duration with only minutes', () => {
      expect(formatValue(45, 'duration')).toBe('45m');
    });

    it('should format number by default', () => {
      const result = formatValue(1234, undefined);
      // Vietnamese formatting uses dot separator
      expect(result).toBeTruthy();
    });

    it('should append unit when applicable', () => {
      const result = formatValue(100, 'number', 'kg');
      expect(result).toContain('kg');
    });

    it('should not append unit for percent format', () => {
      const result = formatValue(50, 'percent', 'kg');
      expect(result).not.toContain('kg');
    });
  });

  describe('calculateChange', () => {
    it('should return UP trend for positive change', () => {
      const result = calculateChange(110, 100);
      expect(result.trend).toBe('UP');
      expect(result.change).toBe(10);
    });

    it('should return DOWN trend for negative change', () => {
      const result = calculateChange(90, 100);
      expect(result.trend).toBe('DOWN');
      expect(result.change).toBe(-10);
    });

    it('should return STABLE for small change', () => {
      const result = calculateChange(100.5, 100);
      expect(result.trend).toBe('STABLE');
    });

    it('should return STABLE when previous is 0', () => {
      const result = calculateChange(100, 0);
      expect(result.change).toBe(0);
      expect(result.trend).toBe('STABLE');
    });
  });

  describe('generateInsights', () => {
    const template: ReportTemplate = REPORT_TEMPLATES.find((t) => t.type === 'OEE_ANALYSIS')!;

    it('should generate SUCCESS insight when target is met', () => {
      const metrics: ReportMetric[] = [
        { id: '1', name: 'oee', nameVi: 'OEE', value: 90, target: 85, format: 'percent' },
      ];
      const insights = generateInsights(metrics, template);
      expect(insights.some((i) => i.type === 'SUCCESS')).toBe(true);
    });

    it('should generate WARNING insight when below 90% of target', () => {
      const metrics: ReportMetric[] = [
        { id: '1', name: 'oee', nameVi: 'OEE', value: 70, target: 85, format: 'percent' },
      ];
      const insights = generateInsights(metrics, template);
      expect(insights.some((i) => i.type === 'WARNING')).toBe(true);
    });

    it('should generate insight for significant change', () => {
      const metrics: ReportMetric[] = [
        { id: '1', name: 'output', nameVi: 'San luong', value: 100, change: 10 },
      ];
      const prodTemplate = REPORT_TEMPLATES.find((t) => t.type === 'PRODUCTION_SUMMARY')!;
      const insights = generateInsights(metrics, prodTemplate);
      expect(insights.some((i) => i.title.includes('tăng'))).toBe(true);
    });

    it('should add OEE recommendation when OEE < 85', () => {
      const metrics: ReportMetric[] = [
        { id: '1', name: 'oee', nameVi: 'OEE', value: 80 },
      ];
      const insights = generateInsights(metrics, template);
      expect(insights.some((i) => i.type === 'RECOMMENDATION')).toBe(true);
    });

    it('should not add OEE recommendation when OEE >= 85', () => {
      const metrics: ReportMetric[] = [
        { id: '1', name: 'oee', nameVi: 'OEE', value: 90 },
      ];
      const insights = generateInsights(metrics, template);
      expect(insights.some((i) => i.type === 'RECOMMENDATION')).toBe(false);
    });

    it('should return empty for metrics with no targets or changes', () => {
      const metrics: ReportMetric[] = [
        { id: '1', name: 'test', nameVi: 'Test', value: 50 },
      ];
      const prodTemplate = REPORT_TEMPLATES.find((t) => t.type === 'PRODUCTION_SUMMARY')!;
      const insights = generateInsights(metrics, prodTemplate);
      expect(insights).toEqual([]);
    });
  });

  describe('generateMockReportData', () => {
    it('should generate data for PRODUCTION_SUMMARY', () => {
      const data = generateMockReportData('PRODUCTION_SUMMARY', 'THIS_WEEK');
      expect(data.type).toBe('PRODUCTION_SUMMARY');
      expect(data.summary.length).toBeGreaterThan(0);
      expect(data.charts.length).toBeGreaterThan(0);
      expect(data.id).toMatch(/^RPT-/);
    });

    it('should generate data for OEE_ANALYSIS', () => {
      const data = generateMockReportData('OEE_ANALYSIS', 'THIS_MONTH');
      expect(data.type).toBe('OEE_ANALYSIS');
      expect(data.summary.length).toBeGreaterThan(0);
    });

    it('should generate data for INVENTORY_STATUS', () => {
      const data = generateMockReportData('INVENTORY_STATUS', 'TODAY');
      expect(data.type).toBe('INVENTORY_STATUS');
    });

    it('should generate data for MAINTENANCE_SUMMARY', () => {
      const data = generateMockReportData('MAINTENANCE_SUMMARY', 'THIS_WEEK');
      expect(data.type).toBe('MAINTENANCE_SUMMARY');
    });

    it('should generate data for DOWNTIME_ANALYSIS', () => {
      const data = generateMockReportData('DOWNTIME_ANALYSIS', 'THIS_WEEK');
      expect(data.type).toBe('DOWNTIME_ANALYSIS');
    });

    it('should generate data for CAPACITY_UTILIZATION', () => {
      const data = generateMockReportData('CAPACITY_UTILIZATION', 'THIS_MONTH');
      expect(data.type).toBe('CAPACITY_UTILIZATION');
    });

    it('should throw for unknown report type', () => {
      expect(() => generateMockReportData('UNKNOWN' as any, 'TODAY')).toThrow('Unknown report type');
    });

    it('should include metadata with generation time', () => {
      const data = generateMockReportData('PRODUCTION_SUMMARY', 'TODAY');
      expect(data.metadata.generationTime).toBeGreaterThanOrEqual(0);
      expect(data.metadata.dataPoints).toBeGreaterThan(0);
    });

    it('should include period info', () => {
      const data = generateMockReportData('PRODUCTION_SUMMARY', 'THIS_WEEK');
      expect(data.period.type).toBe('THIS_WEEK');
      expect(data.period.startDate).toBeTruthy();
      expect(data.period.endDate).toBeTruthy();
    });
  });
});
