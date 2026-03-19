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
        description: `Gộp ${supplier.orderCount} PO nhỏ thành PO lớn để đạt volume discount ~${estimatedDiscount}%`,
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
          "Review lịch đặt hàng hiện tại",
          "Xác định parts có thể gộp đơn",
          "Tạo lịch đặt hàng hợp nhất",
          "Thương lượng xác nhận volume discount",
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
        description: `Chuyển từ ${part.currentSupplierName} sang ${bestAlternative.supplierName} để tiết kiệm ${savingsPercent.toFixed(0)}%`,
        affectedParts: [{ partId: part.partId, partNumber: part.partNumber }],
        currentSpend: part.currentPrice * part.annualVolume,
        potentialSavings: Math.round(annualSavings),
        savingsPercent: Math.round(savingsPercent),
        effort: "MEDIUM",
        confidence: "MEDIUM",
        actionSteps: [
          "Yêu cầu mẫu từ NCC mới",
          "Thực hiện kiểm tra chất lượng",
          "Thương lượng giá và điều khoản",
          "Lập kế hoạch chuyển đổi",
          "Cập nhật danh sách NCC duyệt",
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
        description: `Spend $${(supplier.totalSpend / 1000).toFixed(0)}k/năm — có thể thương lượng giảm ${estimatedDiscount}%`,
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
          "Phân tích dự báo nhu cầu",
          "Chuẩn bị đề xuất thương lượng",
          "Hẹn họp với NCC",
          "Thương lượng điều khoản mới",
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
        description: `Thay NCC import (${country}) bằng NCC nội địa để giảm chi phí vận chuyển và lead time`,
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
          "Tìm kiếm NCC nội địa tương tự",
          "So sánh chất lượng và giá",
          "Đặt mẫu thử nghiệm",
          "Đánh giá NDAA compliance",
          "Lập kế hoạch chuyển đổi",
        ],
      });
    }
  }

  return opportunities;
}
