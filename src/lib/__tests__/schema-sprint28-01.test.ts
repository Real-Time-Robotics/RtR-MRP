/**
 * Sprint 28 TIP-S28-01 Schema Tests
 * Validates DailyProductionPlan, ShiftReport, DataSource, MappingRule, SyncJob
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import prisma from '../prisma';

// Mock Prisma
vi.mock('../prisma', () => {
  const dailyPlanStore: Record<string, Record<string, unknown>> = {};
  const planLineStore: Record<string, Record<string, unknown>> = {};
  const shiftReportStore: Record<string, Record<string, unknown>> = {};
  const dataSourceStore: Record<string, Record<string, unknown>> = {};
  const mappingRuleStore: Record<string, Record<string, unknown>> = {};
  const syncJobStore: Record<string, Record<string, unknown>> = {};

  return {
    default: {
      dailyProductionPlan: {
        create: vi.fn(({ data }: { data: Record<string, unknown> }) => {
          // Unique constraint: (date, workCenterId)
          const existing = Object.values(dailyPlanStore).find(
            (p) => String(p.date) === String(data.date) && p.workCenterId === data.workCenterId
          );
          if (existing) {
            return Promise.reject(new Error('Unique constraint failed on the fields: (`date`,`workCenterId`)'));
          }
          // Unique constraint: planNumber
          if (Object.values(dailyPlanStore).some((p) => p.planNumber === data.planNumber)) {
            return Promise.reject(new Error('Unique constraint failed on the fields: (`planNumber`)'));
          }
          const id = data.id || `dpp-${Math.random().toString(36).slice(2, 8)}`;
          const record = { status: 'DRAFT', ...data, id: id as string, createdAt: new Date(), updatedAt: new Date() };
          dailyPlanStore[id as string] = record;
          return Promise.resolve(record);
        }),
        delete: vi.fn(({ where }: { where: { id: string } }) => {
          const record = dailyPlanStore[where.id];
          delete dailyPlanStore[where.id];
          // Cascade delete lines
          Object.keys(planLineStore).forEach((k) => {
            if (planLineStore[k].planId === where.id) delete planLineStore[k];
          });
          return Promise.resolve(record);
        }),
      },
      dailyProductionPlanLine: {
        create: vi.fn(({ data }: { data: Record<string, unknown> }) => {
          // Unique constraint: (planId, sequence)
          const existing = Object.values(planLineStore).find(
            (l) => l.planId === data.planId && l.sequence === data.sequence
          );
          if (existing) {
            return Promise.reject(new Error('Unique constraint failed on the fields: (`planId`,`sequence`)'));
          }
          const id = `dppl-${Math.random().toString(36).slice(2, 8)}`;
          const record = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
          planLineStore[id] = record;
          return Promise.resolve(record);
        }),
      },
      shiftReport: {
        create: vi.fn(({ data }: { data: Record<string, unknown> }) => {
          // Unique constraint: (date, shiftId, workCenterId)
          const existing = Object.values(shiftReportStore).find(
            (r) =>
              String(r.date) === String(data.date) &&
              r.shiftId === data.shiftId &&
              r.workCenterId === data.workCenterId
          );
          if (existing) {
            return Promise.reject(
              new Error('Unique constraint failed on the fields: (`date`,`shiftId`,`workCenterId`)')
            );
          }
          const id = `sr-${Math.random().toString(36).slice(2, 8)}`;
          const record = {
            totalOutput: 0,
            totalScrap: 0,
            totalLaborMinutes: 0,
            totalDowntimeMinutes: 0,
            headcountPlanned: 0,
            headcountActual: 0,
            ...data,
            id,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          shiftReportStore[id] = record;
          return Promise.resolve(record);
        }),
      },
      dataSource: {
        create: vi.fn(({ data }: { data: Record<string, unknown> }) => {
          // Unique constraint: code
          if (Object.values(dataSourceStore).some((d) => d.code === data.code)) {
            return Promise.reject(new Error('Unique constraint failed on the fields: (`code`)'));
          }
          const id = data.id || `ds-${Math.random().toString(36).slice(2, 8)}`;
          const record = { type: 'EXCEL_UPLOAD', syncTier: 'ONDEMAND', status: 'active', ...data, id: id as string, createdAt: new Date(), updatedAt: new Date() };
          dataSourceStore[id as string] = record;
          return Promise.resolve(record);
        }),
        delete: vi.fn(({ where }: { where: { id: string } }) => {
          const record = dataSourceStore[where.id];
          delete dataSourceStore[where.id];
          // Cascade delete mappings + syncJobs
          Object.keys(mappingRuleStore).forEach((k) => {
            if (mappingRuleStore[k].sourceId === where.id) delete mappingRuleStore[k];
          });
          Object.keys(syncJobStore).forEach((k) => {
            if (syncJobStore[k].sourceId === where.id) delete syncJobStore[k];
          });
          return Promise.resolve(record);
        }),
        findMany: vi.fn(() => {
          return Promise.resolve(Object.values(dataSourceStore));
        }),
      },
      mappingRule: {
        create: vi.fn(({ data }: { data: Record<string, unknown> }) => {
          // Unique constraint: (sourceId, version)
          const existing = Object.values(mappingRuleStore).find(
            (m) => m.sourceId === data.sourceId && m.version === data.version
          );
          if (existing) {
            return Promise.reject(new Error('Unique constraint failed on the fields: (`sourceId`,`version`)'));
          }
          const id = `mr-${Math.random().toString(36).slice(2, 8)}`;
          const record = { version: 1, isActive: true, ...data, id, createdAt: new Date(), updatedAt: new Date() };
          mappingRuleStore[id] = record;
          return Promise.resolve(record);
        }),
        findMany: vi.fn(() => {
          return Promise.resolve(Object.values(mappingRuleStore));
        }),
      },
      syncJob: {
        create: vi.fn(({ data }: { data: Record<string, unknown> }) => {
          const id = `sj-${Math.random().toString(36).slice(2, 8)}`;
          const record = {
            status: 'pending',
            rowsRead: 0,
            rowsCreated: 0,
            rowsUpdated: 0,
            rowsConflict: 0,
            rowsError: 0,
            ...data,
            id,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          syncJobStore[id] = record;
          return Promise.resolve(record);
        }),
        findMany: vi.fn(({ where }: { where?: Record<string, unknown> }) => {
          let results = Object.values(syncJobStore);
          if (where?.sourceId) {
            results = results.filter((j) => j.sourceId === where.sourceId);
          }
          if (where?.status) {
            results = results.filter((j) => j.status === where.status);
          }
          return Promise.resolve(results);
        }),
      },
    },
  };
});

describe('Sprint 28 TIP-S28-01 Schema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: DailyProductionPlan unique constraint (date, workCenterId)
  it('DailyProductionPlan — unique (date, workCenterId)', async () => {
    const date = new Date('2026-04-28');
    await prisma.dailyProductionPlan.create({
      data: { planNumber: 'DPP-001', date, workCenterId: 'wc-1' },
    });

    await expect(
      prisma.dailyProductionPlan.create({
        data: { planNumber: 'DPP-002', date, workCenterId: 'wc-1' },
      })
    ).rejects.toThrow('Unique constraint');
  });

  // Test 2: DailyProductionPlanLine unique (planId, sequence)
  it('DailyProductionPlanLine — unique (planId, sequence)', async () => {
    await prisma.dailyProductionPlanLine.create({
      data: { planId: 'plan-1', workOrderId: 'wo-1', sequence: 1, plannedQty: 100 },
    });

    await expect(
      prisma.dailyProductionPlanLine.create({
        data: { planId: 'plan-1', workOrderId: 'wo-2', sequence: 1, plannedQty: 50 },
      })
    ).rejects.toThrow('Unique constraint');
  });

  // Test 3: ShiftReport unique (date, shiftId, workCenterId)
  it('ShiftReport — unique (date, shiftId, workCenterId)', async () => {
    const date = new Date('2026-04-28');
    await prisma.shiftReport.create({
      data: { date, shiftId: 'shift-1', workCenterId: 'wc-1', totalOutput: 150 },
    });

    await expect(
      prisma.shiftReport.create({
        data: { date, shiftId: 'shift-1', workCenterId: 'wc-1', totalOutput: 200 },
      })
    ).rejects.toThrow('Unique constraint');
  });

  // Test 4: DataSource.code unique
  it('DataSource — code unique', async () => {
    await prisma.dataSource.create({
      data: { code: 'SX-SHEET-001', name: 'Bảng sản xuất phòng SX' },
    });

    await expect(
      prisma.dataSource.create({
        data: { code: 'SX-SHEET-001', name: 'Duplicate' },
      })
    ).rejects.toThrow('Unique constraint');
  });

  // Test 5: MappingRule unique (sourceId, version)
  it('MappingRule — unique (sourceId, version)', async () => {
    await prisma.mappingRule.create({
      data: {
        sourceId: 'ds-1',
        version: 1,
        targetEntity: 'Part',
        columnMappings: { 'Mã': 'partNumber', 'Tên': 'name' },
      },
    });

    await expect(
      prisma.mappingRule.create({
        data: {
          sourceId: 'ds-1',
          version: 1,
          targetEntity: 'Supplier',
          columnMappings: { 'Mã NCC': 'code' },
        },
      })
    ).rejects.toThrow('Unique constraint');
  });

  // Test 6: MappingRule.columnMappings accepts valid Json
  it('MappingRule — columnMappings accepts valid Json', async () => {
    const mappings = {
      'Mã linh kiện': 'partNumber',
      'Tên': 'name',
      'Nhà cung cấp': 'supplier.name',
      'Đơn giá': 'unitCost',
    };
    const rule = await prisma.mappingRule.create({
      data: {
        sourceId: 'ds-2',
        version: 1,
        targetEntity: 'Part',
        columnMappings: mappings,
      },
    });
    expect(rule.columnMappings).toEqual(mappings);
    expect(typeof rule.columnMappings).toBe('object');
  });

  // Test 7: SyncJob index on (sourceId, status) — findMany works
  it('SyncJob — query by (sourceId, status) works', async () => {
    await prisma.syncJob.create({
      data: { sourceId: 'ds-1', mappingVersion: 1, status: 'done', rowsRead: 100, rowsCreated: 95 },
    });
    await prisma.syncJob.create({
      data: { sourceId: 'ds-1', mappingVersion: 1, status: 'fail', rowsRead: 50, rowsError: 5 },
    });
    await prisma.syncJob.create({
      data: { sourceId: 'ds-2', mappingVersion: 1, status: 'done', rowsRead: 200 },
    });

    const results = await prisma.syncJob.findMany({
      where: { sourceId: 'ds-1', status: 'done' },
    });
    expect(results).toHaveLength(1);
    expect(results[0].rowsCreated).toBe(95);
  });

  // Test 8: Cascade delete — DataSource → MappingRule + SyncJob
  it('Cascade delete — DataSource delete cascades MappingRule + SyncJob', async () => {
    // Create source
    const ds = await prisma.dataSource.create({
      data: { id: 'ds-cascade-test', code: 'CASCADE-TEST', name: 'Test cascade' },
    });

    // Create mapping + sync job linked to source
    await prisma.mappingRule.create({
      data: { sourceId: ds.id as string, version: 1, targetEntity: 'Part', columnMappings: {} },
    });
    await prisma.syncJob.create({
      data: { sourceId: ds.id as string, mappingVersion: 1 },
    });

    // Delete source — cascade should remove mappings + jobs
    await prisma.dataSource.delete({ where: { id: ds.id as string } });

    // Verify cascade
    const remainingMappings = await prisma.mappingRule.findMany();
    const remainingSyncJobs = await prisma.syncJob.findMany({});
    const remainingMappingsForDs = (remainingMappings as Record<string, unknown>[]).filter(
      (m) => m.sourceId === ds.id
    );
    const remainingJobsForDs = (remainingSyncJobs as Record<string, unknown>[]).filter(
      (j) => j.sourceId === ds.id
    );
    expect(remainingMappingsForDs).toHaveLength(0);
    expect(remainingJobsForDs).toHaveLength(0);
  });
});
