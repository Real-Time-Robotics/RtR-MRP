/**
 * Comprehensive unit tests for MRP Engine modules.
 *
 * Covers all 16 exported functions across 8 sub-modules:
 *   mrp-run           : runMrpCalculation
 *   suggestion-mgmt   : approveSuggestion, rejectSuggestion
 *   work-order        : createWorkOrder, updateWorkOrderStatus
 *   material-allocation: regenerateAllocations, allocateMaterials
 *   material-issuance  : issueMaterials, issueAdHocMaterials
 *   production-receipt : receiveProductionOutput, confirmProductionReceipt, rejectProductionReceipt
 *   shipment-creation  : createShipment, pickForShipment
 *   shipment-fulfillment: confirmShipment, confirmDelivery
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// ---------------------------------------------------------------------------
// Mock external dependencies BEFORE importing source modules
// ---------------------------------------------------------------------------

// -- Prisma --
vi.mock("@/lib/prisma", () => {
  const mockPrisma: Record<string, unknown> = {
    mrpRun: { create: vi.fn(), update: vi.fn() },
    mrpSuggestion: { update: vi.fn() },
    purchaseOrder: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    purchaseOrderLine: { create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    partSupplier: { findFirst: vi.fn() },
    product: { findUnique: vi.fn() },
    workOrder: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    materialAllocation: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    inventory: {
      findFirst: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    lotTransaction: { create: vi.fn(), findFirst: vi.fn() },
    part: { findFirst: vi.fn(), create: vi.fn() },
    warehouse: { findFirst: vi.fn() },
    productionReceipt: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    salesOrder: { findUnique: vi.fn(), update: vi.fn() },
    salesOrderLine: { updateMany: vi.fn(), findMany: vi.fn() },
    shipment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    systemSetting: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  };
  return { default: mockPrisma, prisma: mockPrisma };
});

// -- Logger --
vi.mock("@/lib/logger", () => ({
  logger: {
    logError: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// -- MRP Core Engine --
const mockMrpEngineExecute = vi.fn().mockResolvedValue({ success: true });
vi.mock("@/lib/mrp/mrp-core", () => {
  return {
    MrpEngine: class MockMrpEngine {
      execute = mockMrpEngineExecute;
      constructor() { /* noop */ }
    },
  };
});

// -- Workflow Triggers --
vi.mock("@/lib/workflow/workflow-triggers", () => ({
  triggerWorkOrderWorkflow: vi.fn().mockResolvedValue({ triggered: true }),
}));

// -- Feature Flags --
vi.mock("@/lib/features/feature-flags", () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(false),
  FEATURE_FLAGS: {
    USE_WIP_WAREHOUSE: "use_wip_warehouse",
    USE_FG_WAREHOUSE: "use_fg_warehouse",
    USE_SHIP_WAREHOUSE: "use_ship_warehouse",
  },
}));

// -- Picking Engine --
vi.mock("@/lib/inventory/picking-engine", () => ({
  allocateByStrategy: vi.fn().mockResolvedValue({
    success: true,
    allocations: [
      { inventoryId: "inv-1", lotNumber: "LOT-001", quantity: 100, expiryDate: null },
    ],
    totalAllocated: 100,
    errors: [],
  }),
  getSortedInventory: vi.fn().mockResolvedValue([
    { id: "inv-1", lotNumber: "LOT-001", quantity: 100, expiryDate: null },
  ]),
}));

// -- Finance cost service --
vi.mock("@/lib/finance/wo-cost-service", () => ({
  recordMaterialCost: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Import source modules AFTER mocks are declared
// ---------------------------------------------------------------------------

import prisma from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/features/feature-flags";
import { allocateByStrategy, getSortedInventory } from "@/lib/inventory/picking-engine";

import { runMrpCalculation } from "../mrp-run";
import { approveSuggestion, rejectSuggestion } from "../suggestion-management";
import { createWorkOrder, updateWorkOrderStatus } from "../work-order";
import { regenerateAllocations, allocateMaterials } from "../material-allocation";
import { issueMaterials, issueAdHocMaterials } from "../material-issuance";
import {
  receiveProductionOutput,
  confirmProductionReceipt,
  rejectProductionReceipt,
} from "../production-receipt";
import { createShipment, pickForShipment } from "../shipment-creation";
import { confirmShipment, confirmDelivery } from "../shipment-fulfillment";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const p = prisma as unknown as Record<string, Record<string, Mock>>;

beforeEach(() => {
  vi.clearAllMocks();
  // Default: all feature flags OFF
  (isFeatureEnabled as Mock).mockResolvedValue(false);
});

// ===========================================================================
// 1. MRP Run Orchestration
// ===========================================================================

describe("mrp-run", () => {
  describe("runMrpCalculation", () => {
    const params = {
      planningHorizonDays: 30,
      includeConfirmed: true,
      includeDraft: false,
      includeSafetyStock: true,
    };

    it("should create a run record, execute engine, and mark completed", async () => {
      const mockRun = { id: "run-1", runNumber: "MRP-2026-123456", status: "running" };
      const updatedRun = { ...mockRun, status: "completed", completedAt: new Date() };
      p.mrpRun.create.mockResolvedValue(mockRun);
      p.mrpRun.update.mockResolvedValue(updatedRun);

      const result = await runMrpCalculation(params);

      expect(p.mrpRun.create).toHaveBeenCalledOnce();
      expect(p.mrpRun.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "running" }),
        })
      );
      expect(p.mrpRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "run-1" },
          data: expect.objectContaining({ status: "completed" }),
        })
      );
      expect(result).toEqual(updatedRun);
    });

    it("should mark run as failed and rethrow when engine throws", async () => {
      const mockRun = { id: "run-2", status: "running" };
      p.mrpRun.create.mockResolvedValue(mockRun);
      p.mrpRun.update.mockResolvedValue({ ...mockRun, status: "failed" });

      // Make the MRP engine execute() return failure
      mockMrpEngineExecute.mockResolvedValueOnce({ success: false });

      await expect(runMrpCalculation(params)).rejects.toThrow("MRP Engine Failure");

      expect(p.mrpRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "failed" },
        })
      );
    });
  });
});

// ===========================================================================
// 2. Suggestion Management
// ===========================================================================

describe("suggestion-management", () => {
  describe("approveSuggestion", () => {
    it("should approve suggestion without creating PO", async () => {
      const suggestion = {
        id: "sug-1",
        partId: "part-1",
        actionType: "PURCHASE",
        supplierId: "sup-1",
        part: { costs: [{ unitCost: 10 }] },
        supplier: {},
      };
      p.mrpSuggestion.update.mockResolvedValue(suggestion);

      const result = await approveSuggestion("sug-1", "user-1", false);

      expect(p.mrpSuggestion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "sug-1" },
          data: expect.objectContaining({ status: "approved", approvedBy: "user-1" }),
        })
      );
      expect(result).toEqual({ suggestion });
      expect(p.purchaseOrder.create).not.toHaveBeenCalled();
    });

    it("should approve and create PO when createPO=true and actionType=PURCHASE", async () => {
      const suggestion = {
        id: "sug-2",
        partId: "part-1",
        actionType: "PURCHASE",
        supplierId: "sup-1",
        suggestedQty: 50,
        suggestedDate: new Date("2026-03-01"),
        estimatedCost: 500,
        part: { costs: [{ unitCost: 10 }] },
        supplier: {},
      };
      const po = { id: "po-1", poNumber: "PO-2026-999999" };
      p.mrpSuggestion.update
        .mockResolvedValueOnce(suggestion)
        .mockResolvedValueOnce({ ...suggestion, status: "converted", convertedPoId: po.id });
      p.purchaseOrder.create.mockResolvedValue(po);

      const result = await approveSuggestion("sug-2", "user-1", true);

      expect(p.purchaseOrder.create).toHaveBeenCalledOnce();
      expect(p.purchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            supplierId: "sup-1",
            status: "draft",
            lines: expect.objectContaining({
              create: expect.objectContaining({
                partId: "part-1",
                quantity: 50,
                unitPrice: 10,
              }),
            }),
          }),
        })
      );
      expect(result).toEqual({ suggestion, po });
    });

    it("should not create PO when actionType is not PURCHASE", async () => {
      const suggestion = {
        id: "sug-3",
        partId: "part-1",
        actionType: "EXPEDITE",
        supplierId: "sup-1",
        part: { costs: [] },
        supplier: {},
      };
      p.mrpSuggestion.update.mockResolvedValue(suggestion);

      const result = await approveSuggestion("sug-3", "user-1", true);

      expect(p.purchaseOrder.create).not.toHaveBeenCalled();
      expect(result).toEqual({ suggestion });
    });
  });

  describe("rejectSuggestion", () => {
    it("should mark suggestion as rejected", async () => {
      const rejected = { id: "sug-4", status: "rejected", approvedBy: "user-1" };
      p.mrpSuggestion.update.mockResolvedValue(rejected);

      const result = await rejectSuggestion("sug-4", "user-1");

      expect(p.mrpSuggestion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "sug-4" },
          data: expect.objectContaining({ status: "rejected", approvedBy: "user-1" }),
        })
      );
      expect(result).toEqual(rejected);
    });
  });
});

// ===========================================================================
// 3. Work Order Management
// ===========================================================================

describe("work-order", () => {
  describe("createWorkOrder", () => {
    it("should create a work order with BOM allocations", async () => {
      const product = {
        id: "prod-1",
        name: "Widget A",
        assemblyHours: 8,
        testingHours: 2,
        bomHeaders: [
          {
            id: "bom-1",
            status: "active",
            bomLines: [
              { partId: "part-1", quantity: 2, scrapRate: 0.05 },
              { partId: "part-2", quantity: 1, scrapRate: 0 },
            ],
          },
        ],
      };
      p.product.findUnique.mockResolvedValue(product);

      const workOrder = {
        id: "wo-1",
        woNumber: "WO-2026-999999",
        status: "draft",
        quantity: 5,
        allocations: [
          { partId: "part-1", requiredQty: 11 },
          { partId: "part-2", requiredQty: 5 },
        ],
        product,
      };
      p.workOrder.create.mockResolvedValue(workOrder);

      const result = await createWorkOrder("prod-1", 5);

      expect(p.product.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "prod-1" } })
      );
      expect(p.workOrder.create).toHaveBeenCalledOnce();
      const createCall = p.workOrder.create.mock.calls[0][0];
      expect(createCall.data.status).toBe("draft");
      expect(createCall.data.quantity).toBe(5);
      expect(createCall.data.productId).toBe("prod-1");
      // BOM-based allocations should be included
      expect(createCall.data.allocations).toBeDefined();
      expect(createCall.data.allocations.create).toHaveLength(2);
      expect(result).toEqual(workOrder);
    });

    it("should create BATCH work order with outputLotNumber", async () => {
      p.product.findUnique.mockResolvedValue({
        id: "prod-2",
        name: "Batch Product",
        assemblyHours: 4,
        testingHours: 1,
        bomHeaders: [],
      });
      p.workOrder.create.mockResolvedValue({ id: "wo-2", woType: "BATCH" });

      await createWorkOrder("prod-2", 100, undefined, undefined, undefined, "normal", undefined, "BATCH", 50);

      const createCall = p.workOrder.create.mock.calls[0][0];
      expect(createCall.data.woType).toBe("BATCH");
      expect(createCall.data.batchSize).toBe(50);
      expect(createCall.data.outputLotNumber).toMatch(/^LOT-WO-/);
    });

    it("should create work order without allocations when no BOM exists", async () => {
      p.product.findUnique.mockResolvedValue({
        id: "prod-3",
        name: "Simple",
        assemblyHours: 16,
        testingHours: 4,
        bomHeaders: [],
      });
      p.workOrder.create.mockResolvedValue({ id: "wo-3", status: "draft" });

      await createWorkOrder("prod-3", 1);

      const createCall = p.workOrder.create.mock.calls[0][0];
      expect(createCall.data.allocations).toBeUndefined();
    });
  });

  describe("updateWorkOrderStatus", () => {
    it("should set actualStart when status is IN_PROGRESS", async () => {
      const updated = { id: "wo-1", status: "IN_PROGRESS", actualStart: new Date() };
      p.workOrder.update.mockResolvedValue(updated);

      const result = await updateWorkOrderStatus("wo-1", "in_progress");

      const updateCall = p.workOrder.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe("IN_PROGRESS");
      expect(updateCall.data.actualStart).toBeInstanceOf(Date);
      expect(result).toEqual(updated);
    });

    it("should set actualEnd and completedQty when COMPLETED", async () => {
      const updated = { id: "wo-1", status: "COMPLETED", completedQty: 10, scrapQty: 1 };
      p.workOrder.update.mockResolvedValue(updated);

      const result = await updateWorkOrderStatus("wo-1", "completed", 10, 1);

      const updateCall = p.workOrder.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe("COMPLETED");
      expect(updateCall.data.actualEnd).toBeInstanceOf(Date);
      expect(updateCall.data.completedQty).toBe(10);
      expect(updateCall.data.scrapQty).toBe(1);
      expect(result).toEqual(updated);
    });

    it("should not set actualStart/actualEnd for other statuses", async () => {
      p.workOrder.update.mockResolvedValue({ id: "wo-1", status: "RELEASED" });

      await updateWorkOrderStatus("wo-1", "released");

      const updateCall = p.workOrder.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe("RELEASED");
      expect(updateCall.data.actualStart).toBeUndefined();
      expect(updateCall.data.actualEnd).toBeUndefined();
    });
  });
});

// ===========================================================================
// 4. Material Allocation
// ===========================================================================

describe("material-allocation", () => {
  describe("regenerateAllocations", () => {
    it("should regenerate allocations from active BOM", async () => {
      const workOrder = {
        id: "wo-1",
        quantity: 10,
        product: {
          bomHeaders: [
            {
              status: "active",
              bomLines: [
                { partId: "part-1", quantity: 3, scrapRate: 0.1 },
              ],
            },
          ],
        },
        allocations: [{ id: "alloc-old", partId: "part-1", status: "pending" }],
      };
      p.workOrder.findUnique.mockResolvedValue(workOrder);
      p.materialAllocation.deleteMany.mockResolvedValue({ count: 1 });
      p.materialAllocation.createMany.mockResolvedValue({ count: 1 });
      const newAllocations = [{ id: "alloc-new", partId: "part-1", requiredQty: 33 }];
      p.materialAllocation.findMany.mockResolvedValue(newAllocations);

      const result = await regenerateAllocations("wo-1");

      expect(p.materialAllocation.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { workOrderId: "wo-1", status: "pending" } })
      );
      expect(p.materialAllocation.createMany).toHaveBeenCalledOnce();
      expect(result.regenerated).toBe(true);
      expect(result.allocations).toEqual(newAllocations);
    });

    it("should throw when work order not found", async () => {
      p.workOrder.findUnique.mockResolvedValue(null);

      await expect(regenerateAllocations("wo-missing")).rejects.toThrow("Work order not found");
    });

    it("should return regenerated=false when no active BOM exists", async () => {
      p.workOrder.findUnique.mockResolvedValue({
        id: "wo-2",
        quantity: 5,
        product: { bomHeaders: [] },
        allocations: [],
      });

      const result = await regenerateAllocations("wo-2");

      expect(result.regenerated).toBe(false);
      expect(result.reason).toBe("No active BOM found");
    });
  });

  describe("allocateMaterials", () => {
    it("should allocate materials from inventory using picking strategy", async () => {
      const pendingAllocs = [
        { id: "alloc-1", partId: "part-1", requiredQty: 10, status: "pending" },
      ];
      p.materialAllocation.findMany
        .mockResolvedValueOnce(pendingAllocs)
        .mockResolvedValueOnce([{ ...pendingAllocs[0], allocatedQty: 10, status: "allocated" }]);
      p.inventory.findFirst.mockResolvedValue({ warehouseId: "wh-1" });
      (allocateByStrategy as Mock).mockResolvedValue({
        success: true,
        allocations: [{ inventoryId: "inv-1", lotNumber: "LOT-1", quantity: 10, expiryDate: null }],
        totalAllocated: 10,
        errors: [],
      });
      p.inventory.update.mockResolvedValue({});
      p.materialAllocation.update.mockResolvedValue({});

      const result = await allocateMaterials("wo-1");

      expect(allocateByStrategy).toHaveBeenCalledWith(
        expect.objectContaining({ partId: "part-1", warehouseId: "wh-1", requiredQty: 10 })
      );
      expect(p.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { reservedQty: { increment: 10 } },
        })
      );
      expect(result.fullyAllocated).toBe(true);
    });

    it("should report fullyAllocated=false when inventory is insufficient", async () => {
      const pendingAllocs = [
        { id: "alloc-2", partId: "part-2", requiredQty: 100, status: "pending" },
      ];
      p.materialAllocation.findMany
        .mockResolvedValueOnce(pendingAllocs)
        .mockResolvedValueOnce([{ ...pendingAllocs[0], allocatedQty: 5, requiredQty: 100 }]);
      p.inventory.findFirst.mockResolvedValue({ warehouseId: "wh-1" });
      (allocateByStrategy as Mock).mockResolvedValue({
        success: true,
        allocations: [{ inventoryId: "inv-2", lotNumber: "LOT-2", quantity: 5, expiryDate: null }],
        totalAllocated: 5,
        errors: [],
      });
      p.inventory.update.mockResolvedValue({});
      p.materialAllocation.update.mockResolvedValue({});

      const result = await allocateMaterials("wo-2");

      expect(result.fullyAllocated).toBe(false);
    });
  });
});

// ===========================================================================
// 5. Material Issuance
// ===========================================================================

describe("material-issuance", () => {
  describe("issueMaterials", () => {
    it("should issue materials and decrement inventory (WIP flag OFF)", async () => {
      (isFeatureEnabled as Mock).mockResolvedValue(false);

      const allocations = [
        {
          id: "alloc-1",
          partId: "part-1",
          requiredQty: 10,
          allocatedQty: 10,
          issuedQty: 0,
          warehouseId: "wh-1",
          lotNumber: "LOT-001",
          status: "allocated",
          part: { unitCost: 5 },
        },
      ];
      p.materialAllocation.findMany
        .mockResolvedValueOnce(allocations)
        .mockResolvedValueOnce([{ ...allocations[0], issuedQty: 10, status: "issued" }]);
      p.inventory.findFirst.mockResolvedValue({
        id: "inv-1",
        quantity: 50,
        reservedQty: 10,
      });
      p.inventory.update.mockResolvedValue({});
      p.materialAllocation.update.mockResolvedValue({});
      p.lotTransaction.create.mockResolvedValue({});

      const result = await issueMaterials("wo-1");

      expect(p.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "inv-1" },
          data: { quantity: { decrement: 10 }, reservedQty: { decrement: 10 } },
        })
      );
      expect(p.materialAllocation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ issuedQty: 10, status: "issued" }),
        })
      );
      expect(result.fullyIssued).toBe(true);
    });

    it("should skip allocation when inventory is insufficient", async () => {
      (isFeatureEnabled as Mock).mockResolvedValue(false);

      p.materialAllocation.findMany
        .mockResolvedValueOnce([
          {
            id: "alloc-2",
            partId: "part-2",
            allocatedQty: 100,
            issuedQty: 0,
            warehouseId: "wh-1",
            lotNumber: null,
            status: "allocated",
            part: { unitCost: 1 },
          },
        ])
        .mockResolvedValueOnce([
          { allocatedQty: 100, issuedQty: 0, requiredQty: 100 },
        ]);
      p.inventory.findFirst.mockResolvedValue({ id: "inv-2", quantity: 5, reservedQty: 5 });

      const result = await issueMaterials("wo-2");

      // inventory.update should NOT be called because quantity(5) < issueQty(100)
      expect(p.inventory.update).not.toHaveBeenCalled();
      expect(result.fullyIssued).toBe(false);
    });
  });

  describe("issueAdHocMaterials", () => {
    it("should issue ad-hoc materials and create lot transaction", async () => {
      const inventory = {
        id: "inv-3",
        quantity: 200,
        reservedQty: 0,
        part: { partNumber: "P-100", name: "Bolt" },
        warehouse: { name: "Main Warehouse" },
      };
      p.inventory.findFirst.mockResolvedValue(inventory);
      p.inventory.update.mockResolvedValue({});
      p.lotTransaction.create.mockResolvedValue({ id: "tx-1" });

      const result = await issueAdHocMaterials({
        partId: "part-1",
        warehouseId: "wh-1",
        quantity: 10,
        lotNumber: "LOT-99",
        reason: "Maintenance",
        issueType: "maintenance",
        userId: "user-1",
      });

      expect(p.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "inv-3" },
          data: { quantity: { decrement: 10 } },
        })
      );
      expect(p.lotTransaction.create).toHaveBeenCalledOnce();
      expect(result.inventory.issuedQty).toBe(10);
      expect(result.inventory.previousQty).toBe(200);
      expect(result.inventory.newQty).toBe(190);
    });

    it("should throw when no inventory found", async () => {
      p.inventory.findFirst.mockResolvedValue(null);

      await expect(
        issueAdHocMaterials({
          partId: "part-missing",
          warehouseId: "wh-1",
          quantity: 1,
          reason: "Test",
          issueType: "scrap",
          userId: "user-1",
        })
      ).rejects.toThrow();
    });

    it("should throw when available quantity is insufficient", async () => {
      p.inventory.findFirst.mockResolvedValue({
        id: "inv-4",
        quantity: 10,
        reservedQty: 8,
        part: { partNumber: "P-200", name: "Nut" },
        warehouse: { name: "WH" },
      });

      await expect(
        issueAdHocMaterials({
          partId: "part-1",
          warehouseId: "wh-1",
          quantity: 5,
          reason: "Need more",
          issueType: "internal",
          userId: "user-1",
        })
      ).rejects.toThrow();
    });

    it("should update existing MaterialAllocation when issuing for a work order", async () => {
      const inventory = {
        id: "inv-5",
        quantity: 100,
        reservedQty: 0,
        part: { partNumber: "P-300", name: "Screw" },
        warehouse: { name: "WH-1" },
      };
      p.inventory.findFirst.mockResolvedValue(inventory);
      p.inventory.update.mockResolvedValue({});
      p.materialAllocation.findUnique.mockResolvedValue({
        id: "alloc-existing",
        workOrderId: "wo-1",
        partId: "part-1",
      });
      p.materialAllocation.update.mockResolvedValue({});
      p.lotTransaction.create.mockResolvedValue({ id: "tx-2" });

      await issueAdHocMaterials({
        partId: "part-1",
        warehouseId: "wh-1",
        quantity: 5,
        reason: "Extra material",
        issueType: "production",
        userId: "user-1",
        workOrderId: "wo-1",
      });

      expect(p.materialAllocation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "alloc-existing" },
          data: { allocatedQty: { increment: 5 }, issuedQty: { increment: 5 } },
        })
      );
    });
  });
});

// ===========================================================================
// 6. Production Receipt
// ===========================================================================

describe("production-receipt", () => {
  describe("receiveProductionOutput", () => {
    it("should create a PENDING production receipt for completed WO", async () => {
      const workOrder = {
        id: "wo-1",
        woNumber: "WO-2026-000001",
        status: "COMPLETED",
        completedQty: 50,
        product: { id: "prod-1", name: "Widget", sku: "WDG-001" },
      };
      p.workOrder.findUnique.mockResolvedValue(workOrder);
      p.productionReceipt.findUnique.mockResolvedValue(null);
      p.lotTransaction.findFirst.mockResolvedValue(null);
      p.part.findFirst.mockResolvedValue({ id: "part-fg-1", partNumber: "WDG-001" });
      p.warehouse.findFirst.mockResolvedValue({ id: "wh-main", type: "MAIN" });
      const receipt = { id: "rcpt-1", status: "PENDING", quantity: 50 };
      p.productionReceipt.create.mockResolvedValue(receipt);

      const result = await receiveProductionOutput("wo-1", "user-1");

      expect(result.status).toBe("PENDING");
      expect(result.receipt).toEqual(receipt);
      expect(p.productionReceipt.create).toHaveBeenCalledOnce();
    });

    it("should throw when work order is not COMPLETED or CLOSED", async () => {
      p.workOrder.findUnique.mockResolvedValue({
        id: "wo-2",
        status: "IN_PROGRESS",
        completedQty: 0,
        product: { id: "prod-1", name: "X", sku: "X-1" },
      });

      await expect(receiveProductionOutput("wo-2", "user-1")).rejects.toThrow();
    });

    it("should throw when work order not found", async () => {
      p.workOrder.findUnique.mockResolvedValue(null);

      await expect(receiveProductionOutput("wo-missing", "user-1")).rejects.toThrow(
        "Work order not found"
      );
    });

    it("should return existing PENDING receipt without creating a new one", async () => {
      p.workOrder.findUnique.mockResolvedValue({
        id: "wo-3",
        status: "COMPLETED",
        completedQty: 10,
        product: { id: "prod-1", name: "Y", sku: "Y-1" },
      });
      const existingReceipt = { id: "rcpt-2", status: "PENDING", quantity: 10 };
      p.productionReceipt.findUnique.mockResolvedValue(existingReceipt);

      const result = await receiveProductionOutput("wo-3", "user-1");

      expect(result.status).toBe("PENDING");
      expect(result.receipt).toEqual(existingReceipt);
      expect(p.productionReceipt.create).not.toHaveBeenCalled();
    });
  });

  describe("confirmProductionReceipt", () => {
    it("should confirm receipt and update inventory via transaction", async () => {
      const receipt = {
        id: "rcpt-1",
        status: "PENDING",
        workOrderId: "wo-1",
        productId: "prod-1",
        partId: "part-fg-1",
        warehouseId: "wh-main",
        lotNumber: "LOT-WO-WO-2026-000001",
        quantity: 50,
        workOrder: { woNumber: "WO-2026-000001" },
        product: { name: "Widget" },
        warehouse: { name: "Main Warehouse" },
      };
      p.productionReceipt.findUnique.mockResolvedValue(receipt);

      // Mock $transaction to execute the callback
      const txMock = {
        productionReceipt: { update: vi.fn().mockResolvedValue({ ...receipt, status: "CONFIRMED" }) },
        warehouse: { findFirst: vi.fn().mockResolvedValue(null) },
        inventory: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "inv-new", quantity: 50 }),
          update: vi.fn(),
          findMany: vi.fn().mockResolvedValue([]),
        },
        materialAllocation: { findMany: vi.fn().mockResolvedValue([]) },
        lotTransaction: { create: vi.fn().mockResolvedValue({}) },
      };
      p.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(txMock));

      const result = await confirmProductionReceipt("rcpt-1", "user-1");

      expect(txMock.productionReceipt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "CONFIRMED", confirmedBy: "user-1" }),
        })
      );
      expect(txMock.inventory.create).toHaveBeenCalledOnce();
      expect(txMock.lotTransaction.create).toHaveBeenCalledOnce();
      expect(result.message).toContain("50");
    });

    it("should throw when receipt not found", async () => {
      p.productionReceipt.findUnique.mockResolvedValue(null);

      await expect(confirmProductionReceipt("rcpt-missing", "user-1")).rejects.toThrow();
    });

    it("should throw when receipt is not PENDING", async () => {
      p.productionReceipt.findUnique.mockResolvedValue({
        id: "rcpt-3",
        status: "CONFIRMED",
        workOrder: {},
        product: {},
        warehouse: {},
      });

      await expect(confirmProductionReceipt("rcpt-3", "user-1")).rejects.toThrow();
    });
  });

  describe("rejectProductionReceipt", () => {
    it("should reject a PENDING receipt with reason", async () => {
      const receipt = {
        id: "rcpt-1",
        status: "PENDING",
        receiptNumber: "PR-WO-001",
        product: { name: "Widget" },
      };
      p.productionReceipt.findUnique.mockResolvedValue(receipt);
      p.productionReceipt.update.mockResolvedValue({ ...receipt, status: "REJECTED" });

      const result = await rejectProductionReceipt("rcpt-1", "user-1", "Quality issue");

      expect(p.productionReceipt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "REJECTED",
            rejectedBy: "user-1",
            rejectedReason: "Quality issue",
          }),
        })
      );
      expect(result.receipt.status).toBe("REJECTED");
    });

    it("should throw when receipt not found", async () => {
      p.productionReceipt.findUnique.mockResolvedValue(null);

      await expect(
        rejectProductionReceipt("rcpt-missing", "user-1", "bad")
      ).rejects.toThrow();
    });

    it("should throw when receipt is not PENDING", async () => {
      p.productionReceipt.findUnique.mockResolvedValue({
        id: "rcpt-2",
        status: "CONFIRMED",
        product: { name: "X" },
      });

      await expect(
        rejectProductionReceipt("rcpt-2", "user-1", "too late")
      ).rejects.toThrow();
    });
  });
});

// ===========================================================================
// 7. Shipment Creation & Picking
// ===========================================================================

describe("shipment-creation", () => {
  describe("createShipment", () => {
    it("should create a shipment from sales order with all remaining lines", async () => {
      const salesOrder = {
        id: "so-1",
        orderNumber: "SO-001",
        status: "completed",
        customerId: "cust-1",
        customer: { id: "cust-1" },
        lines: [
          {
            lineNumber: 1,
            productId: "prod-1",
            product: { name: "Widget" },
            quantity: 10,
            shippedQty: 0,
          },
        ],
        shipments: [],
      };
      p.salesOrder.findUnique.mockResolvedValue(salesOrder);
      const shipment = {
        id: "shp-1",
        shipmentNumber: "SHP-SO-001-001",
        status: "PREPARING",
        lines: [{ lineNumber: 1, productId: "prod-1", quantity: 10 }],
      };
      p.shipment.create.mockResolvedValue(shipment);

      const result = await createShipment("so-1", "user-1");

      expect(p.shipment.create).toHaveBeenCalledOnce();
      expect(result.shipment).toEqual(shipment);
      expect(result.existing).toBe(false);
    });

    it("should throw when sales order not found", async () => {
      p.salesOrder.findUnique.mockResolvedValue(null);

      await expect(createShipment("so-missing", "user-1")).rejects.toThrow();
    });

    it("should throw when sales order status is invalid", async () => {
      p.salesOrder.findUnique.mockResolvedValue({
        id: "so-2",
        status: "draft",
        lines: [],
        customer: {},
        shipments: [],
      });

      await expect(createShipment("so-2", "user-1")).rejects.toThrow();
    });

    it("should throw when all lines are already fully shipped", async () => {
      p.salesOrder.findUnique.mockResolvedValue({
        id: "so-3",
        orderNumber: "SO-003",
        status: "completed",
        customerId: "cust-1",
        customer: {},
        lines: [
          { lineNumber: 1, productId: "prod-1", product: {}, quantity: 10, shippedQty: 10 },
        ],
        shipments: [],
      });

      await expect(createShipment("so-3", "user-1")).rejects.toThrow();
    });
  });

  describe("pickForShipment", () => {
    it("should skip picking when USE_SHIP_WAREHOUSE is OFF", async () => {
      (isFeatureEnabled as Mock).mockResolvedValue(false);

      const result = await pickForShipment("shp-1", "user-1");

      expect(result.success).toBe(true);
      expect(result.pickedItems).toBe(0);
      expect(result.message).toContain("disabled");
    });

    it("should throw when shipment not found (flag ON)", async () => {
      (isFeatureEnabled as Mock).mockResolvedValue(true);
      p.shipment.findUnique.mockResolvedValue(null);

      await expect(pickForShipment("shp-missing", "user-1")).rejects.toThrow();
    });

    it("should throw when shipment status is not PREPARING (flag ON)", async () => {
      (isFeatureEnabled as Mock).mockResolvedValue(true);
      p.shipment.findUnique.mockResolvedValue({
        id: "shp-2",
        status: "SHIPPED",
        salesOrder: {},
        lines: [],
      });

      await expect(pickForShipment("shp-2", "user-1")).rejects.toThrow(
        "Shipment must be in PREPARING status"
      );
    });
  });
});

// ===========================================================================
// 8. Shipment Fulfillment & Delivery
// ===========================================================================

describe("shipment-fulfillment", () => {
  describe("confirmShipment", () => {
    it("should confirm shipment, deduct inventory, and update SO status", async () => {
      const shipment = {
        id: "shp-1",
        shipmentNumber: "SHP-SO-001-001",
        salesOrderId: "so-1",
        status: "PREPARING",
        salesOrder: { orderNumber: "SO-001", status: "completed" },
        lines: [
          {
            lineNumber: 1,
            productId: "prod-1",
            product: { name: "Widget", sku: "WDG-001" },
            quantity: 10,
          },
        ],
        customer: { id: "cust-1" },
      };
      p.shipment.findUnique.mockResolvedValue(shipment);

      // Feature flags all OFF => expected status = PREPARING
      (isFeatureEnabled as Mock).mockResolvedValue(false);

      const txMock = {
        part: { findFirst: vi.fn().mockResolvedValue({ id: "part-1", pickingStrategy: "FIFO" }) },
        warehouse: { findFirst: vi.fn().mockResolvedValue({ id: "wh-1", type: "MAIN" }) },
        inventory: { update: vi.fn().mockResolvedValue({}) },
        lotTransaction: { create: vi.fn().mockResolvedValue({}) },
        salesOrderLine: {
          updateMany: vi.fn().mockResolvedValue({}),
          findMany: vi.fn().mockResolvedValue([{ quantity: 10, shippedQty: 10 }]),
        },
        shipment: { update: vi.fn().mockResolvedValue({ ...shipment, status: "SHIPPED" }) },
        salesOrder: { update: vi.fn().mockResolvedValue({}) },
      };
      p.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(txMock));

      // Mock getSortedInventory for auto-allocation
      (getSortedInventory as Mock).mockResolvedValue([
        { id: "inv-1", lotNumber: "LOT-FG-1", quantity: 100 },
      ]);

      const result = await confirmShipment("shp-1", "user-1", {
        carrier: "DHL",
        trackingNumber: "TRK-123",
      });

      expect(txMock.inventory.update).toHaveBeenCalled();
      expect(txMock.lotTransaction.create).toHaveBeenCalled();
      expect(txMock.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "SHIPPED",
            carrier: "DHL",
            trackingNumber: "TRK-123",
          }),
        })
      );
      expect(txMock.salesOrder.update).toHaveBeenCalled();
      expect(result.shipment.status).toBe("SHIPPED");
    });

    it("should throw when shipment not found", async () => {
      p.shipment.findUnique.mockResolvedValue(null);

      await expect(confirmShipment("shp-missing", "user-1")).rejects.toThrow();
    });

    it("should throw when shipment status does not match expected", async () => {
      (isFeatureEnabled as Mock).mockResolvedValue(false);
      p.shipment.findUnique.mockResolvedValue({
        id: "shp-3",
        status: "SHIPPED",
        salesOrder: {},
        lines: [],
        customer: {},
      });

      await expect(confirmShipment("shp-3", "user-1")).rejects.toThrow();
    });
  });

  describe("confirmDelivery", () => {
    it("should mark shipment as DELIVERED and update SO to delivered when all done", async () => {
      const shipment = {
        id: "shp-1",
        status: "SHIPPED",
        salesOrderId: "so-1",
        salesOrder: { orderNumber: "SO-001" },
      };
      p.shipment.findUnique.mockResolvedValue(shipment);

      const txMock = {
        shipment: {
          update: vi.fn().mockResolvedValue({ ...shipment, status: "DELIVERED" }),
          findMany: vi.fn().mockResolvedValue([{ status: "DELIVERED" }]),
        },
        salesOrderLine: {
          findMany: vi.fn().mockResolvedValue([{ quantity: 10, shippedQty: 10 }]),
        },
        salesOrder: { update: vi.fn().mockResolvedValue({}) },
      };
      p.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(txMock));

      const result = await confirmDelivery("shp-1", "user-1");

      expect(txMock.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "DELIVERED", deliveredBy: "user-1" }),
        })
      );
      // All delivered + all shipped => SO status = "delivered"
      expect(txMock.salesOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "delivered" } })
      );
      expect(result.shipment.status).toBe("DELIVERED");
    });

    it("should throw when shipment not found", async () => {
      p.shipment.findUnique.mockResolvedValue(null);

      await expect(confirmDelivery("shp-missing", "user-1")).rejects.toThrow();
    });

    it("should throw when shipment is not in SHIPPED status", async () => {
      p.shipment.findUnique.mockResolvedValue({
        id: "shp-2",
        status: "PREPARING",
        salesOrder: {},
      });

      await expect(confirmDelivery("shp-2", "user-1")).rejects.toThrow();
    });

    it("should set SO to shipped when all shipped but not all delivered", async () => {
      const shipment = {
        id: "shp-3",
        status: "SHIPPED",
        salesOrderId: "so-2",
        salesOrder: { orderNumber: "SO-002" },
      };
      p.shipment.findUnique.mockResolvedValue(shipment);

      const txMock = {
        shipment: {
          update: vi.fn().mockResolvedValue({ ...shipment, status: "DELIVERED" }),
          findMany: vi.fn().mockResolvedValue([
            { status: "DELIVERED" },
            { status: "SHIPPED" }, // another shipment still in transit
          ]),
        },
        salesOrderLine: {
          findMany: vi.fn().mockResolvedValue([{ quantity: 10, shippedQty: 10 }]),
        },
        salesOrder: { update: vi.fn().mockResolvedValue({}) },
      };
      p.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(txMock));

      await confirmDelivery("shp-3", "user-1");

      // Not all delivered but all shipped => SO status = "shipped"
      expect(txMock.salesOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "shipped" } })
      );
    });
  });
});
