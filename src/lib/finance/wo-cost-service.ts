// src/lib/finance/wo-cost-service.ts
// Work Order actual cost accumulation engine

import { prisma } from "@/lib/prisma";

// ============================================================================
// Configuration Constants
// ============================================================================

/** Default labor rate (USD/hour) used when no system setting is configured.
 *  Override via SystemSetting key "finance.default_labor_rate". */
const FALLBACK_LABOR_RATE = 25;

/** Fetch the configurable labor rate from SystemSetting, falling back to FALLBACK_LABOR_RATE. */
async function getDefaultLaborRate(): Promise<number> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "finance.default_labor_rate" },
    });
    if (setting?.value) {
      const parsed = parseFloat(setting.value);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {
    // If SystemSetting table is unavailable, fall back silently
  }
  return FALLBACK_LABOR_RATE;
}

// ============================================================================
// Interfaces
// ============================================================================

interface MaterialCostInput {
  workOrderId: string;
  partId: string;
  quantity: number;
  unitCost: number;
  lotNumber?: string;
  sourceId?: string;
}

interface LaborCostInput {
  workOrderId: string;
  laborEntryId?: string;
  hours: number;
  hourlyRate: number;
  description?: string;
}

interface CostSummary {
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  subcontractCost: number;
  totalCost: number;
  costPerUnit: number;
  details: Array<{
    category: string;
    description: string | null;
    quantity: number;
    unitCost: number;
    totalCost: number;
    transactionDate: Date;
  }>;
}

interface CostVarianceResult {
  standardCost: number;
  actualCost: number;
  variance: number;
  variancePercent: number;
  breakdown: {
    material: { standard: number; actual: number; variance: number };
    labor: { standard: number; actual: number; variance: number };
  };
}

// ============================================================================
// Cost Type Helpers
// ============================================================================

async function findOrCreateCostType(category: string, code: string, name: string) {
  const existing = await prisma.costType.findUnique({ where: { code } });
  if (existing) return existing;

  return prisma.costType.create({
    data: { code, name, category: category as "MATERIAL" | "LABOR" | "OVERHEAD" | "SUBCONTRACT" },
  });
}

// ============================================================================
// Cost Recording Functions
// ============================================================================

/**
 * Record material cost when materials are issued to a work order.
 */
export async function recordMaterialCost(input: MaterialCostInput) {
  const { workOrderId, partId, quantity, unitCost, lotNumber, sourceId } = input;
  const totalCost = quantity * unitCost;

  const costType = await findOrCreateCostType("MATERIAL", "MAT_DIRECT", "Direct Material");

  const part = await prisma.part.findUnique({
    where: { id: partId },
    select: { partNumber: true, name: true },
  });

  return prisma.workOrderCost.create({
    data: {
      workOrderId,
      costTypeId: costType.id,
      description: `Material: ${part?.partNumber || partId}${lotNumber ? ` (Lot: ${lotNumber})` : ""} - ${part?.name || ""}`,
      quantity,
      unitCost,
      totalCost,
      sourceType: "MATERIAL_ISSUE",
      sourceId: sourceId || partId,
      transactionDate: new Date(),
    },
  });
}

/**
 * Record labor cost when hours are logged against a work order.
 */
export async function recordLaborCost(input: LaborCostInput) {
  const { workOrderId, laborEntryId, hours, hourlyRate, description } = input;
  const totalCost = hours * hourlyRate;

  const costType = await findOrCreateCostType("LABOR", "LAB_DIRECT", "Direct Labor");

  return prisma.workOrderCost.create({
    data: {
      workOrderId,
      costTypeId: costType.id,
      description: description || `Labor: ${hours}h @ ${hourlyRate}/h`,
      quantity: hours,
      unitCost: hourlyRate,
      totalCost,
      sourceType: "LABOR_ENTRY",
      sourceId: laborEntryId,
      transactionDate: new Date(),
    },
  });
}

// ============================================================================
// Cost Summary & Variance
// ============================================================================

/**
 * Get the full cost summary for a work order, grouped by category.
 */
export async function getWOCostSummary(workOrderId: string): Promise<CostSummary> {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    select: { quantity: true, completedQty: true },
  });

  const costs = await prisma.workOrderCost.findMany({
    where: { workOrderId },
    include: { costType: true },
    orderBy: { transactionDate: "asc" },
  });

  let materialCost = 0;
  let laborCost = 0;
  let overheadCost = 0;
  let subcontractCost = 0;

  const details = costs.map((c) => {
    const category = c.costType.category;
    switch (category) {
      case "MATERIAL":
        materialCost += c.totalCost;
        break;
      case "LABOR":
        laborCost += c.totalCost;
        break;
      case "OVERHEAD":
        overheadCost += c.totalCost;
        break;
      case "SUBCONTRACT":
        subcontractCost += c.totalCost;
        break;
    }

    return {
      category,
      description: c.description,
      quantity: c.quantity,
      unitCost: c.unitCost,
      totalCost: c.totalCost,
      transactionDate: c.transactionDate,
    };
  });

  const totalCost = materialCost + laborCost + overheadCost + subcontractCost;
  const outputQty = workOrder?.completedQty || workOrder?.quantity || 1;
  const costPerUnit = totalCost / outputQty;

  return {
    materialCost,
    laborCost,
    overheadCost,
    subcontractCost,
    totalCost,
    costPerUnit,
    details,
  };
}

/**
 * Calculate variance between actual WO cost and the product's standard cost.
 */
export async function calculateVariance(workOrderId: string): Promise<CostVarianceResult> {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      product: {
        include: {
          bomHeaders: {
            where: { status: "active" },
            include: {
              bomLines: {
                include: { part: true },
              },
            },
          },
        },
      },
    },
  });

  if (!workOrder) {
    throw new Error("Work order not found");
  }

  // Calculate standard material cost from BOM
  const bom = workOrder.product.bomHeaders[0];
  let standardMaterialCost = 0;
  if (bom) {
    standardMaterialCost = bom.bomLines.reduce((sum, line) => {
      const partCost = line.part.standardCost ?? line.part.unitCost;
      return sum + line.quantity * partCost * workOrder.quantity;
    }, 0);
  }

  // Standard labor: product's assemblyHours + testingHours
  // Labor rate is configurable via SystemSetting key "finance.default_labor_rate"
  const assemblyHours = workOrder.product.assemblyHours || 0;
  const testingHours = workOrder.product.testingHours || 0;
  const laborRate = await getDefaultLaborRate();
  const standardLaborCost =
    (assemblyHours + testingHours) * workOrder.quantity * laborRate;

  const standardCost = standardMaterialCost + standardLaborCost;

  // Actual cost summary
  const actual = await getWOCostSummary(workOrderId);

  const variance = actual.totalCost - standardCost;
  const variancePercent = standardCost !== 0 ? (variance / standardCost) * 100 : 0;

  return {
    standardCost,
    actualCost: actual.totalCost,
    variance,
    variancePercent,
    breakdown: {
      material: {
        standard: standardMaterialCost,
        actual: actual.materialCost,
        variance: actual.materialCost - standardMaterialCost,
      },
      labor: {
        standard: standardLaborCost,
        actual: actual.laborCost,
        variance: actual.laborCost - standardLaborCost,
      },
    },
  };
}
