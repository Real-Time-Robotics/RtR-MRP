import { describe, it, expect } from "vitest";
import {
  detectConsolidationOpportunities,
  detectSwitchSupplierOpportunities,
  detectNegotiationOpportunities,
  type SupplierSpendData,
} from "@/lib/cost-optimization/supplier-optimization";

describe("detectConsolidationOpportunities", () => {
  it("detects consolidation for multiple small orders", () => {
    const data: SupplierSpendData[] = [
      {
        supplierId: "s1",
        supplierName: "Supplier A",
        totalSpend: 10000,
        orderCount: 5,
        avgOrderValue: 2000,
        parts: [
          { partId: "p1", partNumber: "PRT-001", spend: 5000, quantity: 100, unitPrice: 50 },
          { partId: "p2", partNumber: "PRT-002", spend: 5000, quantity: 200, unitPrice: 25 },
        ],
      },
    ];

    const opps = detectConsolidationOpportunities(data);

    expect(opps).toHaveLength(1);
    expect(opps[0].type).toBe("CONSOLIDATE");
    expect(opps[0].savingsPercent).toBe(15); // >= 5 orders = 15%
    expect(opps[0].potentialSavings).toBe(1500); // 10000 * 15%
    expect(opps[0].effort).toBe("LOW");
  });

  it("uses 10% discount for 3-4 orders", () => {
    const data: SupplierSpendData[] = [
      {
        supplierId: "s1",
        supplierName: "Supplier A",
        totalSpend: 8000,
        orderCount: 3,
        avgOrderValue: 2667,
        parts: [{ partId: "p1", partNumber: "PRT-001", spend: 8000, quantity: 100, unitPrice: 80 }],
      },
    ];

    const opps = detectConsolidationOpportunities(data);

    expect(opps).toHaveLength(1);
    expect(opps[0].savingsPercent).toBe(10); // 3-4 orders = 10%
  });

  it("ignores suppliers with few orders or large average orders", () => {
    const data: SupplierSpendData[] = [
      {
        supplierId: "s1",
        supplierName: "Supplier A",
        totalSpend: 50000,
        orderCount: 2, // too few
        avgOrderValue: 25000,
        parts: [],
      },
      {
        supplierId: "s2",
        supplierName: "Supplier B",
        totalSpend: 100000,
        orderCount: 5,
        avgOrderValue: 20000, // too large
        parts: [],
      },
    ];

    const opps = detectConsolidationOpportunities(data);

    expect(opps).toHaveLength(0);
  });
});

describe("detectSwitchSupplierOpportunities", () => {
  it("detects cheaper NDAA-compliant alternatives", () => {
    const parts = [
      {
        partId: "p1",
        partNumber: "PRT-GPS-001",
        currentSupplierId: "s1",
        currentSupplierName: "Current GPS",
        currentPrice: 80,
        annualVolume: 500,
        alternativeSuppliers: [
          {
            supplierId: "s2",
            supplierName: "Quectel",
            price: 35,
            ndaaCompliant: true,
            qualityRating: 8,
          },
        ],
      },
    ];

    const opps = detectSwitchSupplierOpportunities(parts);

    expect(opps).toHaveLength(1);
    expect(opps[0].type).toBe("SWITCH_SUPPLIER");
    expect(opps[0].potentialSavings).toBe(22500); // (80-35) * 500
    expect(opps[0].savingsPercent).toBe(56); // rounded
  });

  it("ignores alternatives that are not >10% cheaper", () => {
    const parts = [
      {
        partId: "p1",
        partNumber: "PRT-001",
        currentSupplierId: "s1",
        currentSupplierName: "Current",
        currentPrice: 100,
        annualVolume: 500,
        alternativeSuppliers: [
          {
            supplierId: "s2",
            supplierName: "Alt",
            price: 95, // only 5% cheaper
            ndaaCompliant: true,
            qualityRating: 8,
          },
        ],
      },
    ];

    const opps = detectSwitchSupplierOpportunities(parts);

    expect(opps).toHaveLength(0);
  });

  it("ignores non-NDAA compliant alternatives", () => {
    const parts = [
      {
        partId: "p1",
        partNumber: "PRT-001",
        currentSupplierId: "s1",
        currentSupplierName: "Current",
        currentPrice: 100,
        annualVolume: 500,
        alternativeSuppliers: [
          {
            supplierId: "s2",
            supplierName: "Cheap but non-NDAA",
            price: 30,
            ndaaCompliant: false,
            qualityRating: 8,
          },
        ],
      },
    ];

    const opps = detectSwitchSupplierOpportunities(parts);

    expect(opps).toHaveLength(0);
  });

  it("ignores low quality alternatives", () => {
    const parts = [
      {
        partId: "p1",
        partNumber: "PRT-001",
        currentSupplierId: "s1",
        currentSupplierName: "Current",
        currentPrice: 100,
        annualVolume: 500,
        alternativeSuppliers: [
          {
            supplierId: "s2",
            supplierName: "Cheap but low quality",
            price: 30,
            ndaaCompliant: true,
            qualityRating: 5, // below 7
          },
        ],
      },
    ];

    const opps = detectSwitchSupplierOpportunities(parts);

    expect(opps).toHaveLength(0);
  });
});

describe("detectNegotiationOpportunities", () => {
  it("detects negotiation for high-spend suppliers", () => {
    const data: SupplierSpendData[] = [
      {
        supplierId: "s1",
        supplierName: "Big Supplier",
        totalSpend: 120000,
        orderCount: 10,
        avgOrderValue: 12000,
        parts: [{ partId: "p1", partNumber: "PRT-001", spend: 120000, quantity: 500, unitPrice: 240 }],
      },
    ];

    const opps = detectNegotiationOpportunities(data);

    expect(opps).toHaveLength(1);
    expect(opps[0].type).toBe("NEGOTIATE");
    expect(opps[0].savingsPercent).toBe(8); // >= 100k = 8%
    expect(opps[0].potentialSavings).toBe(9600);
  });

  it("uses 5% discount for $50k-$100k spend", () => {
    const data: SupplierSpendData[] = [
      {
        supplierId: "s1",
        supplierName: "Mid Supplier",
        totalSpend: 60000,
        orderCount: 5,
        avgOrderValue: 12000,
        parts: [],
      },
    ];

    const opps = detectNegotiationOpportunities(data);

    expect(opps).toHaveLength(1);
    expect(opps[0].savingsPercent).toBe(5);
    expect(opps[0].potentialSavings).toBe(3000);
  });

  it("ignores low-spend suppliers", () => {
    const data: SupplierSpendData[] = [
      {
        supplierId: "s1",
        supplierName: "Small Supplier",
        totalSpend: 5000,
        orderCount: 2,
        avgOrderValue: 2500,
        parts: [],
      },
    ];

    const opps = detectNegotiationOpportunities(data);

    expect(opps).toHaveLength(0);
  });
});
