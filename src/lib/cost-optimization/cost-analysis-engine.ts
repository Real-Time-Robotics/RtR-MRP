// Cost Analysis Engine — analyzes real BOM/Parts data to generate cost reduction scenarios
import prisma from "@/lib/prisma";
import { calculateROI } from "./roi-calculations";
import { calculateScore } from "./scoring";
import {
  detectConsolidationOpportunities,
  detectNegotiationOpportunities,
  type SupplierSpendData,
} from "./supplier-optimization";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export type AnalysisType =
  | "BOM_ROLLUP"
  | "MAKE_VS_BUY"
  | "SUBSTITUTES"
  | "SUPPLIER_CONSOLIDATION";

export interface CostAnalysisParams {
  productIds?: string[];
  analysisTypes: AnalysisType[];
  clearPrevious: boolean;
  userId: string;
}

export interface CostAnalysisResult {
  productsAnalyzed: number;
  bomRollups: number;
  makeVsBuyCount: number;
  substituteCount: number;
  supplierOpportunities: number;
  totalPotentialSavings: number;
  costTargetId: string | null;
  duration: number;
}

// ============================================================================
// Main entry point
// ============================================================================

export async function runCostAnalysis(
  params: CostAnalysisParams
): Promise<CostAnalysisResult> {
  const start = Date.now();
  const { analysisTypes, clearPrevious, userId } = params;

  logger.info("[CostAnalysis] Starting cost analysis...", { analysisTypes });

  // Step 1: Clear previous data if requested
  if (clearPrevious) {
    await clearPreviousData();
  }

  // Step 2: Fetch products with BOMs
  const whereClause = params.productIds?.length
    ? { id: { in: params.productIds } }
    : {};

  const products = await prisma.product.findMany({
    where: {
      ...whereClause,
      bomHeaders: { some: { status: "active" } },
    },
    include: {
      bomHeaders: {
        where: { status: "active" },
        include: {
          bomLines: {
            include: {
              part: true,
            },
          },
        },
      },
    },
  });

  if (products.length === 0) {
    return {
      productsAnalyzed: 0,
      bomRollups: 0,
      makeVsBuyCount: 0,
      substituteCount: 0,
      supplierOpportunities: 0,
      totalPotentialSavings: 0,
      costTargetId: null,
      duration: Date.now() - start,
    };
  }

  // Collect all unique parts from BOMs
  const allParts = new Map<string, typeof products[0]["bomHeaders"][0]["bomLines"][0]["part"]>();
  for (const product of products) {
    for (const header of product.bomHeaders) {
      for (const line of header.bomLines) {
        if (line.part) {
          allParts.set(line.part.id, line.part);
        }
      }
    }
  }

  // Step 3: Run analyses
  let bomRollups = 0;
  let makeVsBuyCount = 0;
  let substituteCount = 0;
  let supplierOpportunities = 0;
  let totalPotentialSavings = 0;

  // We need a product to anchor the CostTarget — use the first one
  const firstProduct = products[0];
  let costTargetId: string | null = null;

  // Create CostTarget
  const now = new Date();
  const dateStr = now.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const costTarget = await prisma.costTarget.create({
    data: {
      productId: firstProduct.id,
      name: `Cost Analysis — ${dateStr}`,
      currentCost: 0,
      targetCost: 0,
      targetDate: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000), // 6 months
      status: "ACTIVE",
      createdById: userId,
    },
  });
  costTargetId = costTarget.id;

  // BOM Rollup
  if (analysisTypes.includes("BOM_ROLLUP")) {
    const result = await performBomCostRollup(products, costTargetId, userId);
    bomRollups = result.rollupCount;
    totalPotentialSavings += result.savings;
  }

  // Make vs Buy
  if (analysisTypes.includes("MAKE_VS_BUY")) {
    const parts = Array.from(allParts.values());
    const result = await performMakeVsBuyAnalysis(parts, products, costTargetId, userId);
    makeVsBuyCount = result.count;
    totalPotentialSavings += result.savings;
  }

  // Substitutes
  if (analysisTypes.includes("SUBSTITUTES")) {
    const parts = Array.from(allParts.values());
    const result = await performSubstituteAnalysis(parts, costTargetId, userId);
    substituteCount = result.count;
    totalPotentialSavings += result.savings;
  }

  // Supplier Consolidation
  if (analysisTypes.includes("SUPPLIER_CONSOLIDATION")) {
    const result = await performSupplierConsolidation(costTargetId, userId);
    supplierOpportunities = result.count;
    totalPotentialSavings += result.savings;
  }

  // Update CostTarget with totals
  const totalCurrentCost = await calculateTotalCurrentCost(products);
  await prisma.costTarget.update({
    where: { id: costTargetId },
    data: {
      currentCost: totalCurrentCost,
      targetCost: totalCurrentCost - totalPotentialSavings,
    },
  });

  const duration = Date.now() - start;
  logger.info("[CostAnalysis] Completed", {
    productsAnalyzed: products.length,
    bomRollups,
    makeVsBuyCount,
    substituteCount,
    supplierOpportunities,
    totalPotentialSavings,
    duration,
  });

  return {
    productsAnalyzed: products.length,
    bomRollups,
    makeVsBuyCount,
    substituteCount,
    supplierOpportunities,
    totalPotentialSavings: Math.round(totalPotentialSavings * 100) / 100,
    costTargetId,
    duration,
  };
}

// ============================================================================
// Clear previous analysis data
// ============================================================================

async function clearPreviousData(): Promise<void> {
  logger.info("[CostAnalysis] Clearing previous data...");

  // Delete in dependency order (children first)
  await prisma.savingsRecord.deleteMany({});
  await prisma.costReductionAction.deleteMany({});
  await prisma.costReductionPhase.deleteMany({});
  await prisma.costTarget.deleteMany({});
  await prisma.makeVsBuyAnalysis.deleteMany({});
  await prisma.substituteEvaluation.deleteMany({});
  await prisma.partCostRollup.deleteMany({});
  await prisma.partAutonomyStatus.deleteMany({});

  logger.info("[CostAnalysis] Previous data cleared");
}

// ============================================================================
// BOM Cost Rollup
// ============================================================================

type ProductWithBom = Awaited<ReturnType<typeof prisma.product.findMany>>[0] & {
  bomHeaders: Array<{
    id: string;
    bomLines: Array<{
      quantity: number;
      scrapRate: number;
      part: {
        id: string;
        partNumber: string;
        name: string;
        unitCost: number;
        category: string;
      };
    }>;
  }>;
};

async function performBomCostRollup(
  products: ProductWithBom[],
  costTargetId: string,
  userId: string
): Promise<{ rollupCount: number; savings: number }> {
  // Track cost per part across all BOMs
  const partCostMap = new Map<
    string,
    { totalQty: number; unitCost: number; extendedCosts: number[] }
  >();

  // Track per-product cost breakdown for Pareto
  const productCosts: Array<{
    productId: string;
    productName: string;
    totalCost: number;
    lineCosts: Array<{
      partId: string;
      partNumber: string;
      partName: string;
      extendedCost: number;
    }>;
  }> = [];

  for (const product of products) {
    for (const header of product.bomHeaders) {
      let totalProductCost = 0;
      const lineCosts: typeof productCosts[0]["lineCosts"] = [];

      for (const line of header.bomLines) {
        const part = line.part;
        if (!part) continue;

        const effectiveQty = line.quantity / (1 - (line.scrapRate || 0));
        const extendedCost = part.unitCost * effectiveQty;
        totalProductCost += extendedCost;

        lineCosts.push({
          partId: part.id,
          partNumber: part.partNumber,
          partName: part.name,
          extendedCost,
        });

        // Accumulate for PartCostRollup
        const existing = partCostMap.get(part.id);
        if (existing) {
          existing.totalQty += effectiveQty;
          existing.extendedCosts.push(extendedCost);
        } else {
          partCostMap.set(part.id, {
            totalQty: effectiveQty,
            unitCost: part.unitCost,
            extendedCosts: [extendedCost],
          });
        }
      }

      productCosts.push({
        productId: product.id,
        productName: product.name,
        totalCost: totalProductCost,
        lineCosts,
      });
    }
  }

  // Upsert PartCostRollup records
  let rollupCount = 0;
  for (const [partId, data] of partCostMap) {
    const materialCost = data.unitCost * data.totalQty;
    await prisma.partCostRollup.upsert({
      where: { partId },
      create: {
        partId,
        materialCost,
        totalStandardCost: materialCost,
        totalCurrentCost: materialCost,
        bomLevel: 1,
        lastRollupAt: new Date(),
        rollupStatus: "CURRENT",
      },
      update: {
        materialCost,
        totalStandardCost: materialCost,
        totalCurrentCost: materialCost,
        lastRollupAt: new Date(),
        rollupStatus: "CURRENT",
      },
    });
    rollupCount++;
  }

  // Identify Pareto parts (top parts contributing to 80% of total cost)
  const allLineCosts = productCosts.flatMap((p) => p.lineCosts);
  const totalAllCost = allLineCosts.reduce((sum, l) => sum + l.extendedCost, 0);

  // Group by partId to get total cost per part
  const partTotalCosts = new Map<string, { partNumber: string; partName: string; totalCost: number }>();
  for (const line of allLineCosts) {
    const existing = partTotalCosts.get(line.partId);
    if (existing) {
      existing.totalCost += line.extendedCost;
    } else {
      partTotalCosts.set(line.partId, {
        partNumber: line.partNumber,
        partName: line.partName,
        totalCost: line.extendedCost,
      });
    }
  }

  const sortedParts = Array.from(partTotalCosts.entries()).sort(
    (a, b) => b[1].totalCost - a[1].totalCost
  );

  // Create phase for BOM Rollup Pareto actions
  let savings = 0;
  if (sortedParts.length > 0) {
    const phase = await prisma.costReductionPhase.create({
      data: {
        costTargetId,
        name: "BOM Cost Rollup — Pareto Analysis",
        targetCost: 0,
        targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        status: "PLANNED",
      },
    });

    let cumulativeCost = 0;
    for (const [partId, partInfo] of sortedParts) {
      cumulativeCost += partInfo.totalCost;
      const costPercent = totalAllCost > 0 ? (partInfo.totalCost / totalAllCost) * 100 : 0;

      if (cumulativeCost > totalAllCost * 0.8) break; // Stop after 80%

      // Estimate 5% potential savings on high-cost parts through process improvement
      const estimatedSavings = partInfo.totalCost * 0.05;
      savings += estimatedSavings;

      await prisma.costReductionAction.create({
        data: {
          phaseId: phase.id,
          type: "PROCESS_IMPROVE",
          partId,
          description: `${partInfo.partNumber} (${partInfo.partName}) — chiếm ${costPercent.toFixed(1)}% giá thành. Cần tối ưu chi phí.`,
          currentCost: partInfo.totalCost,
          targetCost: partInfo.totalCost - estimatedSavings,
          savingsPerUnit: estimatedSavings / (partCostMap.get(partId)?.totalQty || 1),
          annualVolume: Math.round((partCostMap.get(partId)?.totalQty || 1) * 100),
          annualSavings: estimatedSavings * 100,
          targetCompletionDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          status: "IDEA",
          riskLevel: "LOW",
          ownerId: userId,
        },
      });
    }
  }

  return { rollupCount, savings };
}

// ============================================================================
// Make vs Buy Analysis
// ============================================================================

async function performMakeVsBuyAnalysis(
  parts: Array<{
    id: string;
    partNumber: string;
    name: string;
    unitCost: number;
    category: string;
    makeOrBuy: string;
  }>,
  products: ProductWithBom[],
  costTargetId: string,
  userId: string
): Promise<{ count: number; savings: number }> {
  // Filter candidates for Make vs Buy analysis
  const candidates = parts.filter((part) => inferMakeOrBuy(part) === "MAKE");

  if (candidates.length === 0) {
    return { count: 0, savings: 0 };
  }

  // Calculate BOM quantity per part (how many of each part across all BOMs)
  const partBomQty = new Map<string, number>();
  for (const product of products) {
    for (const header of product.bomHeaders) {
      for (const line of header.bomLines) {
        const existing = partBomQty.get(line.part.id) || 0;
        partBomQty.set(line.part.id, existing + line.quantity);
      }
    }
  }

  // Create phase
  const phase = await prisma.costReductionPhase.create({
    data: {
      costTargetId,
      name: "Make vs Buy Analysis",
      targetCost: 0,
      targetDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
      status: "PLANNED",
    },
  });

  let count = 0;
  let totalSavings = 0;

  for (const part of candidates) {
    const buyPrice = part.unitCost;
    if (buyPrice <= 0) continue;

    const makeCostEstimate = buyPrice * 0.65; // 35% estimated savings
    const investment =
      part.category === "MECH"
        ? 50000
        : part.category === "ELEC"
          ? 30000
          : 20000;

    const bomQty = partBomQty.get(part.id) || 1;
    const annualVolume = bomQty * 100; // Estimate 100 units/year

    const roi = calculateROI({
      buyPrice,
      makeCost: makeCostEstimate,
      investment,
      annualVolume,
    });

    const scoring = calculateScore({
      savingsPercent: roi.savingsPercent,
      investmentRequired: investment,
      breakEvenMonths: roi.breakEvenMonths,
      volumeCertainty: 5,
      technicalSkillAvailable: 5,
      equipmentAvailable: 5,
      qualityCapability: 5,
      capacityAvailable: 5,
      supplyChainRiskReduction: 5,
      complianceBenefit: 5,
      leadTimeReduction: 5,
      ipProtection: 5,
    });

    // Create MakeVsBuyAnalysis record
    await prisma.makeVsBuyAnalysis.create({
      data: {
        partId: part.id,
        buyPrice,
        buyMOQ: 1,
        buyLeadTimeDays: 14,
        buyRisks: ["Phụ thuộc NCC ngoài"],
        makeCostEstimate,
        makeInvestmentRequired: investment,
        makeLeadTimeDays: 7,
        makeTimelineMonths: 6,
        savingsPerUnit: roi.savingsPerUnit,
        annualVolumeEstimate: annualVolume,
        annualSavings: roi.annualSavings,
        breakEvenUnits: roi.breakEvenUnits,
        breakEvenMonths: roi.breakEvenMonths,
        npv3Year: roi.npv3Year,
        financialScore: scoring.financialScore,
        capabilityScore: scoring.capabilityScore,
        strategicScore: scoring.strategicScore,
        overallScore: scoring.overallScore,
        recommendation: scoring.recommendation,
        recommendationRationale: scoring.rationale,
        conditions: scoring.conditions,
        status: "ANALYSIS_DRAFT",
        createdById: userId,
      },
    });

    // Create CostReductionAction
    if (roi.annualSavings > 0) {
      await prisma.costReductionAction.create({
        data: {
          phaseId: phase.id,
          type: "MAKE_VS_BUY",
          partId: part.id,
          description: `${part.partNumber} — Tự sản xuất tiết kiệm ${roi.savingsPercent.toFixed(0)}% (${scoring.recommendation})`,
          currentCost: buyPrice,
          targetCost: makeCostEstimate,
          savingsPerUnit: roi.savingsPerUnit,
          annualVolume,
          annualSavings: roi.annualSavings,
          investmentRequired: investment,
          breakEvenUnits: roi.breakEvenUnits,
          roiMonths: roi.paybackMonths,
          targetCompletionDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
          status: "IDEA",
          riskLevel: scoring.overallScore >= 6 ? "LOW" : "MEDIUM",
          ownerId: userId,
        },
      });
      totalSavings += roi.annualSavings;
    }

    count++;
  }

  return { count, savings: totalSavings };
}

// ============================================================================
// Substitute Analysis
// ============================================================================

async function performSubstituteAnalysis(
  parts: Array<{
    id: string;
    partNumber: string;
    name: string;
    unitCost: number;
    category: string;
  }>,
  costTargetId: string,
  userId: string
): Promise<{ count: number; savings: number }> {
  // Group parts by category
  const partsByCategory = new Map<string, typeof parts>();
  for (const part of parts) {
    const cat = part.category || "OTHER";
    const group = partsByCategory.get(cat) || [];
    group.push(part);
    partsByCategory.set(cat, group);
  }

  // Create phase
  const phase = await prisma.costReductionPhase.create({
    data: {
      costTargetId,
      name: "Substitute Part Analysis",
      targetCost: 0,
      targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      status: "PLANNED",
    },
  });

  let count = 0;
  let totalSavings = 0;

  for (const [, groupParts] of partsByCategory) {
    if (groupParts.length < 2) continue;

    // Sort by cost descending
    const sorted = [...groupParts].sort((a, b) => b.unitCost - a.unitCost);

    for (let i = 0; i < sorted.length; i++) {
      const expensivePart = sorted[i];
      if (expensivePart.unitCost <= 0) continue;

      // Find cheaper alternatives (>= 10% cheaper)
      const cheaperAlternatives = sorted.filter(
        (p) =>
          p.id !== expensivePart.id &&
          p.unitCost > 0 &&
          p.unitCost < expensivePart.unitCost * 0.9
      );

      if (cheaperAlternatives.length === 0) continue;

      // Use cheapest alternative
      const cheapest = cheaperAlternatives[cheaperAlternatives.length - 1];
      const savingsPercent =
        ((expensivePart.unitCost - cheapest.unitCost) / expensivePart.unitCost) * 100;
      const savingsPerUnit = expensivePart.unitCost - cheapest.unitCost;

      await prisma.substituteEvaluation.create({
        data: {
          originalPartId: expensivePart.id,
          substitutePartId: cheapest.id,
          originalPrice: expensivePart.unitCost,
          substitutePrice: cheapest.unitCost,
          savingsPercent,
          compatibilityScore: 0.7,
          ndaaCompliant: true,
          itarCompliant: true,
          riskLevel: "MEDIUM",
          riskFactors: ["Cần kiểm tra tương thích kỹ thuật", "Cần test mẫu"],
          status: "IDENTIFIED",
          createdById: userId,
        },
      });

      // CostReductionAction
      await prisma.costReductionAction.create({
        data: {
          phaseId: phase.id,
          type: "SUBSTITUTE",
          partId: expensivePart.id,
          description: `Thay ${expensivePart.partNumber} bằng ${cheapest.partNumber} — tiết kiệm ${savingsPercent.toFixed(0)}%`,
          currentCost: expensivePart.unitCost,
          targetCost: cheapest.unitCost,
          savingsPerUnit,
          annualVolume: 100,
          annualSavings: savingsPerUnit * 100,
          targetCompletionDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          status: "IDEA",
          riskLevel: "MEDIUM",
          ownerId: userId,
        },
      });

      totalSavings += savingsPerUnit * 100;
      count++;
    }
  }

  return { count, savings: totalSavings };
}

// ============================================================================
// Supplier Consolidation
// ============================================================================

async function performSupplierConsolidation(
  costTargetId: string,
  userId: string
): Promise<{ count: number; savings: number }> {
  // Query PartSupplier data
  const partSuppliers = await prisma.partSupplier.findMany({
    include: {
      part: true,
      supplier: true,
    },
  });

  if (partSuppliers.length === 0) {
    return { count: 0, savings: 0 };
  }

  // Build SupplierSpendData
  const supplierMap = new Map<string, SupplierSpendData>();
  for (const ps of partSuppliers) {
    const existing = supplierMap.get(ps.supplierId);
    const spend = ps.unitPrice * (ps.minOrderQty || 1);
    const partEntry = {
      partId: ps.partId,
      partNumber: ps.part.partNumber,
      spend,
      quantity: ps.minOrderQty || 1,
      unitPrice: ps.unitPrice,
    };

    if (existing) {
      existing.totalSpend += spend;
      existing.orderCount += 1;
      existing.parts.push(partEntry);
      existing.avgOrderValue = existing.totalSpend / existing.orderCount;
    } else {
      supplierMap.set(ps.supplierId, {
        supplierId: ps.supplierId,
        supplierName: ps.supplier.name,
        totalSpend: spend,
        orderCount: 1,
        avgOrderValue: spend,
        parts: [partEntry],
      });
    }
  }

  const supplierData = Array.from(supplierMap.values());

  // Detect opportunities using existing functions
  const consolidation = detectConsolidationOpportunities(supplierData);
  const negotiation = detectNegotiationOpportunities(supplierData);
  const allOpportunities = [...consolidation, ...negotiation];

  if (allOpportunities.length === 0) {
    return { count: 0, savings: 0 };
  }

  // Create phase
  const phase = await prisma.costReductionPhase.create({
    data: {
      costTargetId,
      name: "Supplier Optimization",
      targetCost: 0,
      targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      status: "PLANNED",
    },
  });

  let totalSavings = 0;
  for (const opp of allOpportunities) {
    await prisma.costReductionAction.create({
      data: {
        phaseId: phase.id,
        type: "SUPPLIER_OPTIMIZE",
        description: `${opp.title} — ${opp.description}`,
        currentCost: opp.currentSpend,
        targetCost: opp.currentSpend - opp.potentialSavings,
        savingsPerUnit: 0,
        annualVolume: 1,
        annualSavings: opp.potentialSavings,
        targetCompletionDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        status: "IDEA",
        riskLevel: opp.effort === "HIGH" ? "MEDIUM" : "LOW",
        ownerId: userId,
      },
    });
    totalSavings += opp.potentialSavings;
  }

  return { count: allOpportunities.length, savings: totalSavings };
}

// ============================================================================
// Helpers
// ============================================================================

function inferMakeOrBuy(part: {
  makeOrBuy: string;
  category: string;
  name: string;
}): "MAKE" | "BUY" {
  if (part.makeOrBuy === "MAKE") return "MAKE";
  if (part.category === "MECH") return "MAKE";
  const makeKeywords = ["cnc", "gia công", "tự chế", "machined", "fabricated"];
  const nameLower = part.name.toLowerCase();
  if (makeKeywords.some((kw) => nameLower.includes(kw))) return "MAKE";
  return "BUY";
}

async function calculateTotalCurrentCost(products: ProductWithBom[]): Promise<number> {
  let total = 0;
  for (const product of products) {
    for (const header of product.bomHeaders) {
      for (const line of header.bomLines) {
        if (line.part) {
          const effectiveQty = line.quantity / (1 - (line.scrapRate || 0));
          total += line.part.unitCost * effectiveQty;
        }
      }
    }
  }
  return Math.round(total * 100) / 100;
}
