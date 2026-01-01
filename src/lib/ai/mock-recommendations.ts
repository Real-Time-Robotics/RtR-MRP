// lib/ai/mock-recommendations.ts
// Client-safe mock data - no Prisma imports

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

// Generate mock recommendations for demo - safe for client-side use
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
