/**
 * MRP Engine Unit Tests
 * Tests for MRP calculation, suggestion management, work orders, and material allocation
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import {
  runMrpCalculation,
  approveSuggestion,
  rejectSuggestion,
  createWorkOrder,
  allocateMaterials,
  updateWorkOrderStatus,
} from '../mrp-engine';
import prisma from '../prisma';
import { allocateByStrategy } from '../inventory/picking-engine';

// Mock Prisma
vi.mock('../prisma', () => ({
  default: {
    mrpRun: {
      create: vi.fn(),
      update: vi.fn(),
    },
    mrpSuggestion: {
      update: vi.fn(),
      findMany: vi.fn(),
    },
    purchaseOrder: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    purchaseOrderLine: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    partSupplier: {
      findFirst: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
    },
    workOrder: {
      create: vi.fn(),
      update: vi.fn(),
    },
    materialAllocation: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    inventory: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock execute function - needs to be before the mock
let mockExecuteSuccess = true;

// Mock MRP Core Engine
vi.mock('../mrp/mrp-core', () => {
  return {
    MrpEngine: class MockMrpEngine {
      async execute() {
        return { success: mockExecuteSuccess };
      }
    },
  };
});

// Mock picking engine
vi.mock('../inventory/picking-engine', () => ({
  allocateByStrategy: vi.fn(),
  getSortedInventory: vi.fn(),
}));

// Mock workflow triggers
vi.mock('../workflow/workflow-triggers', () => ({
  triggerWorkOrderWorkflow: vi.fn().mockResolvedValue({ triggered: true }),
}));

// Mock feature flags
vi.mock('../features/feature-flags', () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(false),
  FEATURE_FLAGS: {
    USE_WIP_WAREHOUSE: 'use_wip_warehouse',
    USE_FG_WAREHOUSE: 'use_fg_warehouse',
    USE_SHIP_WAREHOUSE: 'use_ship_warehouse',
  },
}));

// Mock finance cost service
vi.mock('../finance/wo-cost-service', () => ({
  recordMaterialCost: vi.fn().mockResolvedValue({}),
}));

describe('MRP Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runMrpCalculation', () => {
    it('should create MRP run and execute successfully', async () => {
      const mockMrpRun = {
        id: 'run-1',
        runNumber: 'MRP-2026-123456',
        status: 'running',
      };

      (prisma.mrpRun.create as Mock).mockResolvedValue(mockMrpRun);
      (prisma.mrpRun.update as Mock).mockResolvedValue({
        ...mockMrpRun,
        status: 'completed',
        completedAt: expect.any(Date),
      });

      const params = {
        planningHorizonDays: 30,
        includeConfirmed: true,
        includeDraft: false,
        includeSafetyStock: true,
      };

      const result = await runMrpCalculation(params);

      expect(prisma.mrpRun.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          runNumber: expect.stringMatching(/^MRP-\d{4}-\d+$/),
          planningHorizon: 30,
          status: 'running',
        }),
      });

      expect(prisma.mrpRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(Date),
        }),
      });
    });

    it('should update status to failed on error', async () => {
      const mockMrpRun = { id: 'run-1', runNumber: 'MRP-2026-123456' };

      (prisma.mrpRun.create as Mock).mockResolvedValue(mockMrpRun);

      // Mock MRP engine to fail for this test
      mockExecuteSuccess = false;

      const params = {
        planningHorizonDays: 30,
        includeConfirmed: true,
        includeDraft: false,
        includeSafetyStock: true,
      };

      await expect(runMrpCalculation(params)).rejects.toThrow('MRP Engine Failure');

      expect(prisma.mrpRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: { status: 'failed' },
      });

      // Reset for other tests
      mockExecuteSuccess = true;
    });
  });

  describe('approveSuggestion', () => {
    it('should approve suggestion without creating PO', async () => {
      const mockSuggestion = {
        id: 'sug-1',
        actionType: 'PURCHASE',
        supplierId: 'sup-1',
        status: 'approved',
        approvedBy: 'user-1',
        part: { costs: [{ unitCost: 10 }] },
        supplier: { id: 'sup-1', name: 'Supplier A' },
      };

      (prisma.mrpSuggestion.update as Mock).mockResolvedValue(mockSuggestion);

      const result = await approveSuggestion('sug-1', 'user-1', false);

      expect(result.suggestion).toEqual(mockSuggestion);
      expect(result.po).toBeUndefined();
      expect(prisma.purchaseOrder.create).not.toHaveBeenCalled();
    });

    it('should approve suggestion and create PO when requested', async () => {
      const mockSuggestion = {
        id: 'sug-1',
        partId: 'part-1',
        actionType: 'PURCHASE',
        supplierId: 'sup-1',
        suggestedQty: 100,
        suggestedDate: new Date('2026-02-15'),
        estimatedCost: 1000,
        status: 'approved',
        part: { costs: [{ unitCost: 10 }] },
        supplier: { id: 'sup-1', name: 'Supplier A' },
      };

      const mockPO = {
        id: 'po-1',
        poNumber: 'PO-2026-123456',
        supplierId: 'sup-1',
        status: 'draft',
      };

      (prisma.mrpSuggestion.update as Mock)
        .mockResolvedValueOnce(mockSuggestion)
        .mockResolvedValueOnce({ ...mockSuggestion, status: 'converted', convertedPoId: 'po-1' });

      (prisma.purchaseOrder.create as Mock).mockResolvedValue(mockPO);

      const result = await approveSuggestion('sug-1', 'user-1', true);

      expect(result.po).toBeDefined();
      expect(prisma.purchaseOrder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          poNumber: expect.stringMatching(/^PO-\d{4}-\d+$/),
          supplierId: 'sup-1',
          status: 'draft',
          lines: {
            create: expect.objectContaining({
              lineNumber: 1,
              partId: 'part-1',
              quantity: 100,
            }),
          },
        }),
      });
    });

    it('should not create PO for non-PURCHASE suggestions', async () => {
      const mockSuggestion = {
        id: 'sug-1',
        actionType: 'EXPEDITE',
        supplierId: 'sup-1',
        status: 'approved',
        part: { costs: [] },
      };

      (prisma.mrpSuggestion.update as Mock).mockResolvedValue(mockSuggestion);

      const result = await approveSuggestion('sug-1', 'user-1', true);

      expect(result.po).toBeUndefined();
      expect(prisma.purchaseOrder.create).not.toHaveBeenCalled();
    });

    it('should not create PO when no supplier specified', async () => {
      const mockSuggestion = {
        id: 'sug-1',
        actionType: 'PURCHASE',
        supplierId: null, // No supplier
        status: 'approved',
        part: { costs: [] },
      };

      (prisma.mrpSuggestion.update as Mock).mockResolvedValue(mockSuggestion);

      const result = await approveSuggestion('sug-1', 'user-1', true);

      expect(result.po).toBeUndefined();
      expect(prisma.purchaseOrder.create).not.toHaveBeenCalled();
    });
  });

  describe('rejectSuggestion', () => {
    it('should update suggestion status to rejected', async () => {
      const mockSuggestion = {
        id: 'sug-1',
        status: 'rejected',
        approvedBy: 'user-1',
        approvedAt: expect.any(Date),
      };

      (prisma.mrpSuggestion.update as Mock).mockResolvedValue(mockSuggestion);

      const result = await rejectSuggestion('sug-1', 'user-1');

      expect(prisma.mrpSuggestion.update).toHaveBeenCalledWith({
        where: { id: 'sug-1' },
        data: {
          status: 'rejected',
          approvedBy: 'user-1',
          approvedAt: expect.any(Date),
        },
      });

      expect(result.status).toBe('rejected');
    });
  });

  describe('createWorkOrder', () => {
    it('should create work order with material allocations from BOM', async () => {
      const mockProduct = {
        id: 'prod-1',
        assemblyHours: 8,
        testingHours: 2,
        bomHeaders: [
          {
            status: 'active',
            bomLines: [
              { partId: 'part-1', quantity: 2, scrapRate: 0.05 },
              { partId: 'part-2', quantity: 5, scrapRate: 0.02 },
            ],
          },
        ],
      };

      const mockWorkOrder = {
        id: 'wo-1',
        woNumber: 'WO-2026-123456',
        productId: 'prod-1',
        quantity: 10,
        status: 'draft',
        allocations: [
          { partId: 'part-1', requiredQty: 21 },
          { partId: 'part-2', requiredQty: 51 },
        ],
        product: mockProduct,
      };

      (prisma.product.findUnique as Mock).mockResolvedValue(mockProduct);
      (prisma.workOrder.create as Mock).mockResolvedValue(mockWorkOrder);

      const result = await createWorkOrder('prod-1', 10, 'so-1', 1, new Date('2026-02-01'), 'high');

      expect(prisma.workOrder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          woNumber: expect.stringMatching(/^WO-\d{4}-\d+$/),
          productId: 'prod-1',
          quantity: 10,
          salesOrderId: 'so-1',
          salesOrderLine: 1,
          priority: 'high',
          status: 'draft',
          allocations: {
            create: expect.arrayContaining([
              expect.objectContaining({
                partId: 'part-1',
                requiredQty: 21, // ceil(2 * 10 * 1.05)
              }),
              expect.objectContaining({
                partId: 'part-2',
                requiredQty: 51, // ceil(5 * 10 * 1.02)
              }),
            ]),
          },
        }),
        include: expect.any(Object),
      });

      expect(result.woNumber).toMatch(/^WO-\d{4}-\d+$/);
    });

    it('should create work order without allocations if no BOM found', async () => {
      const mockProduct = {
        id: 'prod-1',
        assemblyHours: 8,
        testingHours: 2,
        bomHeaders: [], // No BOM
      };

      const mockWorkOrder = {
        id: 'wo-1',
        woNumber: 'WO-2026-123456',
        status: 'draft',
      };

      (prisma.product.findUnique as Mock).mockResolvedValue(mockProduct);
      (prisma.workOrder.create as Mock).mockResolvedValue(mockWorkOrder);

      await createWorkOrder('prod-1', 10);

      expect(prisma.workOrder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          allocations: undefined,
        }),
        include: expect.any(Object),
      });
    });

    it('should calculate planned dates based on assembly hours', async () => {
      const mockProduct = {
        id: 'prod-1',
        assemblyHours: 4,
        testingHours: 1,
        bomHeaders: [],
      };

      (prisma.product.findUnique as Mock).mockResolvedValue(mockProduct);
      (prisma.workOrder.create as Mock).mockImplementation(async (args) => args.data);

      const startDate = new Date('2026-02-01T08:00:00Z');
      await createWorkOrder('prod-1', 10, undefined, undefined, startDate);

      expect(prisma.workOrder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          plannedStart: startDate,
          plannedEnd: expect.any(Date),
        }),
        include: expect.any(Object),
      });

      const callArgs = (prisma.workOrder.create as Mock).mock.calls[0][0];
      const plannedEnd = callArgs.data.plannedEnd as Date;
      // totalHours = (4 + 1) * 10 = 50 hours
      const expectedEnd = new Date(startDate.getTime() + 50 * 60 * 60 * 1000);
      expect(plannedEnd.getTime()).toBe(expectedEnd.getTime());
    });
  });

  describe('allocateMaterials', () => {
    it('should allocate available materials to work order', async () => {
      const mockAllocations = [
        { id: 'alloc-1', partId: 'part-1', requiredQty: 20, status: 'pending' },
        { id: 'alloc-2', partId: 'part-2', requiredQty: 10, status: 'pending' },
      ];

      (prisma.materialAllocation.findMany as Mock)
        .mockResolvedValueOnce(mockAllocations)
        .mockResolvedValueOnce([
          { ...mockAllocations[0], allocatedQty: 20, requiredQty: 20, status: 'allocated' },
          { ...mockAllocations[1], allocatedQty: 5, requiredQty: 10, status: 'pending' },
        ]);

      // inventory.findFirst returns warehouse records for each part
      (prisma.inventory.findFirst as Mock)
        .mockResolvedValueOnce({ warehouseId: 'wh-1' })
        .mockResolvedValueOnce({ warehouseId: 'wh-1' });

      // allocateByStrategy returns picking results
      (allocateByStrategy as Mock)
        .mockResolvedValueOnce({
          allocations: [{ inventoryId: 'inv-1', lotNumber: 'LOT-001', quantity: 20 }],
          totalAllocated: 20,
          success: true,
          errors: [],
        })
        .mockResolvedValueOnce({
          allocations: [{ inventoryId: 'inv-2', lotNumber: 'LOT-002', quantity: 5 }],
          totalAllocated: 5,
          success: true,
          errors: [],
        });

      (prisma.inventory.update as Mock).mockResolvedValue({});
      (prisma.materialAllocation.update as Mock).mockResolvedValue({});

      const result = await allocateMaterials('wo-1');

      // First part fully allocated (20 available >= 20 needed)
      expect(prisma.materialAllocation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'alloc-1' },
          data: expect.objectContaining({
            allocatedQty: 20,
            status: 'allocated',
          }),
        })
      );

      // Second part partially allocated (5 available < 10 needed)
      expect(prisma.materialAllocation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'alloc-2' },
          data: expect.objectContaining({
            allocatedQty: 5,
            status: 'pending',
          }),
        })
      );

      expect(result.fullyAllocated).toBe(false);
    });

    it('should return fullyAllocated true when all materials are allocated', async () => {
      const mockAllocations = [
        { id: 'alloc-1', partId: 'part-1', requiredQty: 10, status: 'pending' },
      ];

      (prisma.materialAllocation.findMany as Mock)
        .mockResolvedValueOnce(mockAllocations)
        .mockResolvedValueOnce([
          { ...mockAllocations[0], allocatedQty: 10, requiredQty: 10, status: 'allocated' },
        ]);

      (prisma.inventory.findFirst as Mock).mockResolvedValue({ warehouseId: 'wh-1' });

      (allocateByStrategy as Mock).mockResolvedValue({
        allocations: [{ inventoryId: 'inv-1', lotNumber: 'LOT-001', quantity: 10 }],
        totalAllocated: 10,
        success: true,
        errors: [],
      });

      (prisma.inventory.update as Mock).mockResolvedValue({});
      (prisma.materialAllocation.update as Mock).mockResolvedValue({});

      const result = await allocateMaterials('wo-1');

      expect(result.fullyAllocated).toBe(true);
    });

    it('should handle no inventory available', async () => {
      const mockAllocations = [
        { id: 'alloc-1', partId: 'part-1', requiredQty: 10, status: 'pending' },
      ];

      (prisma.materialAllocation.findMany as Mock)
        .mockResolvedValueOnce(mockAllocations)
        .mockResolvedValueOnce(mockAllocations);

      // No inventory record found for the part
      (prisma.inventory.findFirst as Mock).mockResolvedValue(null);

      const result = await allocateMaterials('wo-1');

      expect(prisma.inventory.update).not.toHaveBeenCalled();
      expect(prisma.materialAllocation.update).not.toHaveBeenCalled();
      expect(result.fullyAllocated).toBe(false);
    });
  });

  describe('updateWorkOrderStatus', () => {
    const expectedInclude = {
      product: true,
      allocations: { include: { part: true } },
    };

    it('should update status to IN_PROGRESS with actualStart', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        status: 'IN_PROGRESS',
        actualStart: new Date(),
      };

      (prisma.workOrder.update as Mock).mockResolvedValue(mockWorkOrder);

      const result = await updateWorkOrderStatus('wo-1', 'in_progress');

      expect(prisma.workOrder.update).toHaveBeenCalledWith({
        where: { id: 'wo-1' },
        data: {
          status: 'IN_PROGRESS',
          actualStart: expect.any(Date),
        },
        include: expectedInclude,
      });

      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should update status to COMPLETED with actualEnd and completedQty', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        status: 'COMPLETED',
        completedQty: 95,
        actualEnd: new Date(),
      };

      (prisma.workOrder.update as Mock).mockResolvedValue(mockWorkOrder);

      const result = await updateWorkOrderStatus('wo-1', 'completed', 95);

      expect(prisma.workOrder.update).toHaveBeenCalledWith({
        where: { id: 'wo-1' },
        data: {
          status: 'COMPLETED',
          actualEnd: expect.any(Date),
          completedQty: 95,
        },
        include: expectedInclude,
      });

      expect(result.completedQty).toBe(95);
    });

    it('should update other statuses without special date handling', async () => {
      const mockWorkOrder = { id: 'wo-1', status: 'ON_HOLD' };

      (prisma.workOrder.update as Mock).mockResolvedValue(mockWorkOrder);

      await updateWorkOrderStatus('wo-1', 'on_hold');

      expect(prisma.workOrder.update).toHaveBeenCalledWith({
        where: { id: 'wo-1' },
        data: { status: 'ON_HOLD' },
        include: expectedInclude,
      });
    });
  });
});
