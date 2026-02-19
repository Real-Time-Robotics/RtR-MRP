// lib/ai/recommendation-engine.ts

import { prisma } from "../prisma";
import { logger } from '@/lib/logger';

export interface Recommendation {
  id: string;
  type: "REORDER" | "SUPPLIER_CHANGE" | "SAFETY_STOCK" | "EXPEDITE" | "CONSOLIDATE";
  priority: "HIGH" | "MEDIUM" | "LOW";
  category: "inventory" | "purchasing" | "production" | "supplier";
  title: string;
  description: string;
  impact?: string;
  savingsEstimate?: number;
  confidence: number;
  partId?: string;
  supplierId?: string;
  productId?: string;
  status: string;
}

export async function generateRecommendations(): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = [];

  try {
    // 1. Check for reorder needs
    const parts = await prisma.part.findMany({
      include: {
        inventory: true,
        planning: true,
        costs: true,
        partSuppliers: {
          include: { supplier: true },
          where: { isPreferred: true },
        },
      },
    });

    for (const part of parts) {
      const totalStock = part.inventory.reduce(
        (sum, inv) => sum + inv.quantity - inv.reservedQty,
        0
      );

      const reorderPoint = part.planning?.reorderPoint || 0;
      const safetyStock = part.planning?.safetyStock || 0;

      if (totalStock < reorderPoint) {
        const urgency = totalStock < safetyStock ? "HIGH" : "MEDIUM";
        const shortage = reorderPoint - totalStock;
        const supplier = part.partSuppliers[0]?.supplier;

        recommendations.push({
          id: `rec-reorder-${part.id}`,
          type: "REORDER",
          priority: urgency,
          category: "inventory",
          title: `Reorder ${part.partNumber}`,
          description: `Stock at ${totalStock} units, below reorder point of ${reorderPoint}. Need to order ${shortage}+ units.`,
          impact: "Prevents potential stock-out affecting production",
          savingsEstimate: shortage * (part.costs?.[0]?.unitCost || 0) * 0.1,
          confidence: 0.92,
          partId: part.id,
          supplierId: supplier?.id,
          status: "active",
        });
      }

      // Safety stock recommendation

      if (
        totalStock > safetyStock &&
        totalStock < safetyStock * 1.5 &&
        part.isCritical
      ) {
        recommendations.push({
          id: `rec-safety-${part.id}`,
          type: "SAFETY_STOCK",
          priority: "MEDIUM",
          category: "inventory",
          title: `Increase safety stock for ${part.partNumber}`,
          description: `Critical part with minimal buffer. Consider increasing safety stock from ${safetyStock} to ${Math.round(safetyStock * 1.5)} units.`,
          impact: "Reduces risk of production delays",
          confidence: 0.78,
          partId: part.id,
          status: "active",
        });
      }
    }

    // 2. Check supplier risks
    const riskySuppliers = await prisma.supplierRiskScore.findMany({
      where: { riskLevel: { in: ["HIGH", "CRITICAL"] } },
      include: { supplier: true },
    });

    for (const risk of riskySuppliers) {
      const riskList = (risk.risks as string[]) || [];
      recommendations.push({
        id: `rec-supplier-${risk.supplierId}`,
        type: "SUPPLIER_CHANGE",
        priority: risk.riskLevel === "CRITICAL" ? "HIGH" : "MEDIUM",
        category: "supplier",
        title: `Review ${risk.supplier.name} relationship`,
        description: `Risk score declined to ${risk.overallScore}/100. ${riskList.join(". ") || "Multiple risk factors detected."}`,
        impact: "Reduce supply chain disruption risk",
        confidence: 0.85,
        supplierId: risk.supplierId,
        status: "active",
      });
    }

    // 3. Check for PO consolidation opportunities
    const pendingPOs = await prisma.purchaseOrder.groupBy({
      by: ["supplierId"],
      where: { status: "draft" },
      _count: true,
    });

    for (const group of pendingPOs) {
      if (group._count > 1) {
        const supplier = await prisma.supplier.findUnique({
          where: { id: group.supplierId },
        });

        recommendations.push({
          id: `rec-consolidate-${group.supplierId}`,
          type: "CONSOLIDATE",
          priority: "LOW",
          category: "purchasing",
          title: `Consolidate orders to ${supplier?.name || "supplier"}`,
          description: `${group._count} pending POs can be consolidated for volume discount.`,
          impact: "Reduce shipping costs and improve terms",
          savingsEstimate: group._count * 150,
          confidence: 0.88,
          supplierId: group.supplierId,
          status: "active",
        });
      }
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'recommendation-engine' });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// Save recommendations to database
export async function saveRecommendations(
  recommendations: Recommendation[]
): Promise<void> {
  // Clear old active recommendations
  await prisma.aiRecommendation.updateMany({
    where: { status: "active" },
    data: { status: "expired" },
  });

  // Create new recommendations
  for (const rec of recommendations) {
    await prisma.aiRecommendation.create({
      data: {
        type: rec.type,
        priority: rec.priority,
        category: rec.category,
        title: rec.title,
        description: rec.description,
        impact: rec.impact,
        savingsEstimate: rec.savingsEstimate,
        confidence: rec.confidence,
        partId: rec.partId,
        supplierId: rec.supplierId,
        productId: rec.productId,
        status: "active",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
  }
}

