// lib/ai/recommendation-engine.ts

import { prisma } from "../prisma";

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

      if (totalStock < part.reorderPoint) {
        const urgency = totalStock < part.safetyStock ? "HIGH" : "MEDIUM";
        const shortage = part.reorderPoint - totalStock;
        const supplier = part.partSuppliers[0]?.supplier;

        recommendations.push({
          id: `rec-reorder-${part.id}`,
          type: "REORDER",
          priority: urgency,
          category: "inventory",
          title: `Reorder ${part.partNumber}`,
          description: `Stock at ${totalStock} units, below reorder point of ${part.reorderPoint}. Need to order ${shortage}+ units.`,
          impact: "Prevents potential stock-out affecting production",
          savingsEstimate: shortage * part.unitCost * 0.1,
          confidence: 0.92,
          partId: part.id,
          supplierId: supplier?.id,
          status: "active",
        });
      }

      // Safety stock recommendation
      if (
        totalStock > part.safetyStock &&
        totalStock < part.safetyStock * 1.5 &&
        part.isCritical
      ) {
        recommendations.push({
          id: `rec-safety-${part.id}`,
          type: "SAFETY_STOCK",
          priority: "MEDIUM",
          category: "inventory",
          title: `Increase safety stock for ${part.partNumber}`,
          description: `Critical part with minimal buffer. Consider increasing safety stock from ${part.safetyStock} to ${Math.round(part.safetyStock * 1.5)} units.`,
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
    console.error("Error generating recommendations:", error);
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

// Generate mock recommendations for demo
export function generateMockRecommendations(): Recommendation[] {
  return [
    {
      id: "rec-1",
      type: "REORDER",
      priority: "HIGH",
      category: "inventory",
      title: "Order 40 Motors NOW",
      description:
        "PRT-MT-001 will be short in 14 days. Current stock: 21 units after reserved. Demand next 30d: 64 units.",
      impact: "Prevents $85,000 order delay",
      savingsEstimate: 8500,
      confidence: 0.94,
      partId: "part-1",
      status: "active",
    },
    {
      id: "rec-2",
      type: "SUPPLIER_CHANGE",
      priority: "HIGH",
      category: "supplier",
      title: "Supplier risk increasing",
      description:
        "FLIR delivery performance dropped 15% in last quarter. Consider backup supplier qualification.",
      impact: "Reduce supply risk for thermal cameras",
      confidence: 0.87,
      supplierId: "sup-1",
      status: "active",
    },
    {
      id: "rec-3",
      type: "SAFETY_STOCK",
      priority: "MEDIUM",
      category: "inventory",
      title: "Increase safety stock for AI Module",
      description:
        "PRT-AI-001 demand variability is 35% above normal. Recommend increasing safety stock by 5 units.",
      impact: "Reduces stock-out probability by 40%",
      savingsEstimate: 2500,
      confidence: 0.78,
      partId: "part-2",
      status: "active",
    },
    {
      id: "rec-4",
      type: "CONSOLIDATE",
      priority: "LOW",
      category: "purchasing",
      title: "Consolidate orders to KDE Direct",
      description:
        "3 pending POs to same supplier. Consolidate for volume discount.",
      impact: "Reduce shipping costs",
      savingsEstimate: 450,
      confidence: 0.88,
      supplierId: "sup-2",
      status: "active",
    },
    {
      id: "rec-5",
      type: "EXPEDITE",
      priority: "MEDIUM",
      category: "purchasing",
      title: "Expedite PO-2024-0156",
      description:
        "Lead time prediction shows 5 day delay likely. Request expedited shipping to meet production schedule.",
      impact: "Prevents production delay for SO-2024-008",
      confidence: 0.82,
      status: "active",
    },
  ];
}
