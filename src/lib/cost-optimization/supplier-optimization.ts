export type OpportunityType =
  | "CONSOLIDATE"
  | "SWITCH_SUPPLIER"
  | "NEGOTIATE"
  | "LOCAL_SOURCE";

export interface Opportunity {
  id: string;
  type: OpportunityType;
  supplierId?: string;
  supplierName?: string;
  title: string;
  description: string;
  affectedParts: { partId: string; partNumber: string }[];
  currentSpend: number;
  potentialSavings: number;
  savingsPercent: number;
  effort: "LOW" | "MEDIUM" | "HIGH";
  confidence: "LOW" | "MEDIUM" | "HIGH";
  actionSteps: string[];
}

export interface SupplierSpendData {
  supplierId: string;
  supplierName: string;
  totalSpend: number;
  orderCount: number;
  avgOrderValue: number;
  parts: {
    partId: string;
    partNumber: string;
    spend: number;
    quantity: number;
    unitPrice: number;
  }[];
}

export function detectConsolidationOpportunities(
  supplierData: SupplierSpendData[]
): Opportunity[] {
  const opportunities: Opportunity[] = [];

  for (const supplier of supplierData) {
    // Multiple small orders from same supplier
    if (supplier.orderCount >= 3 && supplier.avgOrderValue < 5000) {
      const estimatedDiscount = supplier.orderCount >= 5 ? 15 : 10;
      const potentialSavings = supplier.totalSpend * (estimatedDiscount / 100);

      opportunities.push({
        id: `consolidate-${supplier.supplierId}`,
        type: "CONSOLIDATE",
        supplierId: supplier.supplierId,
        supplierName: supplier.supplierName,
        title: `Consolidate Orders — ${supplier.supplierName}`,
        description: `Gop ${supplier.orderCount} PO nho thanh PO lon de dat volume discount ~${estimatedDiscount}%`,
        affectedParts: supplier.parts.map((p) => ({
          partId: p.partId,
          partNumber: p.partNumber,
        })),
        currentSpend: supplier.totalSpend,
        potentialSavings: Math.round(potentialSavings),
        savingsPercent: estimatedDiscount,
        effort: "LOW",
        confidence: "HIGH",
        actionSteps: [
          "Review lich dat hang hien tai",
          "Xac dinh parts co the gop don",
          "Tao lich dat hang hop nhat",
          "Thuong luong xac nhan volume discount",
        ],
      });
    }
  }

  return opportunities;
}

export function detectSwitchSupplierOpportunities(
  partPricing: {
    partId: string;
    partNumber: string;
    currentSupplierId: string;
    currentSupplierName: string;
    currentPrice: number;
    annualVolume: number;
    alternativeSuppliers: {
      supplierId: string;
      supplierName: string;
      price: number;
      ndaaCompliant: boolean;
      qualityRating: number;
    }[];
  }[]
): Opportunity[] {
  const opportunities: Opportunity[] = [];

  for (const part of partPricing) {
    const cheaperAlternatives = part.alternativeSuppliers.filter(
      (alt) =>
        alt.price < part.currentPrice * 0.9 &&
        alt.ndaaCompliant &&
        alt.qualityRating >= 7
    );

    if (cheaperAlternatives.length > 0) {
      const bestAlternative = cheaperAlternatives.reduce((best, alt) =>
        alt.price < best.price ? alt : best
      );

      const savingsPercent =
        ((part.currentPrice - bestAlternative.price) / part.currentPrice) * 100;
      const annualSavings =
        (part.currentPrice - bestAlternative.price) * part.annualVolume;

      opportunities.push({
        id: `switch-${part.partId}-${bestAlternative.supplierId}`,
        type: "SWITCH_SUPPLIER",
        supplierId: bestAlternative.supplierId,
        supplierName: bestAlternative.supplierName,
        title: `Switch Supplier — ${part.partNumber}`,
        description: `Chuyen tu ${part.currentSupplierName} sang ${bestAlternative.supplierName} de tiet kiem ${savingsPercent.toFixed(0)}%`,
        affectedParts: [{ partId: part.partId, partNumber: part.partNumber }],
        currentSpend: part.currentPrice * part.annualVolume,
        potentialSavings: Math.round(annualSavings),
        savingsPercent: Math.round(savingsPercent),
        effort: "MEDIUM",
        confidence: "MEDIUM",
        actionSteps: [
          "Yeu cau mau tu NCC moi",
          "Thuc hien kiem tra chat luong",
          "Thuong luong gia va dieu khoan",
          "Lap ke hoach chuyen doi",
          "Cap nhat danh sach NCC duyet",
        ],
      });
    }
  }

  return opportunities;
}

export function detectNegotiationOpportunities(
  supplierData: SupplierSpendData[]
): Opportunity[] {
  const opportunities: Opportunity[] = [];

  for (const supplier of supplierData) {
    // High spend suppliers are good negotiation targets
    if (supplier.totalSpend >= 50000) {
      const estimatedDiscount = supplier.totalSpend >= 100000 ? 8 : 5;
      const potentialSavings = supplier.totalSpend * (estimatedDiscount / 100);

      opportunities.push({
        id: `negotiate-${supplier.supplierId}`,
        type: "NEGOTIATE",
        supplierId: supplier.supplierId,
        supplierName: supplier.supplierName,
        title: `Negotiate Pricing — ${supplier.supplierName}`,
        description: `Spend $${(supplier.totalSpend / 1000).toFixed(0)}k/nam — co the thuong luong giam ${estimatedDiscount}%`,
        affectedParts: supplier.parts.map((p) => ({
          partId: p.partId,
          partNumber: p.partNumber,
        })),
        currentSpend: supplier.totalSpend,
        potentialSavings: Math.round(potentialSavings),
        savingsPercent: estimatedDiscount,
        effort: "LOW",
        confidence: "MEDIUM",
        actionSteps: [
          "Phan tich du bao nhu cau",
          "Chuan bi de xuat thuong luong",
          "Hen hop voi NCC",
          "Thuong luong dieu khoan moi",
        ],
      });
    }
  }

  return opportunities;
}

export function detectLocalSourceOpportunities(
  supplierData: SupplierSpendData[],
  supplierCountries: Record<string, string>
): Opportunity[] {
  const opportunities: Opportunity[] = [];

  for (const supplier of supplierData) {
    const country = supplierCountries[supplier.supplierId];
    if (country && country !== "VN" && country !== "Vietnam" && supplier.totalSpend >= 10000) {
      const estimatedSavings = supplier.totalSpend * 0.12; // ~12% logistics savings

      opportunities.push({
        id: `local-${supplier.supplierId}`,
        type: "LOCAL_SOURCE",
        supplierId: supplier.supplierId,
        supplierName: supplier.supplierName,
        title: `Local Source — ${supplier.supplierName}`,
        description: `Thay NCC import (${country}) bang NCC noi dia de giam chi phi van chuyen va lead time`,
        affectedParts: supplier.parts.map((p) => ({
          partId: p.partId,
          partNumber: p.partNumber,
        })),
        currentSpend: supplier.totalSpend,
        potentialSavings: Math.round(estimatedSavings),
        savingsPercent: 12,
        effort: "HIGH",
        confidence: "LOW",
        actionSteps: [
          "Tim kiem NCC noi dia tuong tu",
          "So sanh chat luong va gia",
          "Dat mau thu nghiem",
          "Danh gia NDAA compliance",
          "Lap ke hoach chuyen doi",
        ],
      });
    }
  }

  return opportunities;
}
