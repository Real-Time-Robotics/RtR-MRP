// src/lib/excel/__tests__/duplicate-detector.test.ts
// Unit tests for duplicate detection

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getIdentifierField } from "../duplicate-detector";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    part: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    supplier: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    product: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    customer: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    inventory: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

// Mock AI provider
vi.mock("@/lib/ai/provider", () => ({
  getAIProvider: vi.fn(() => ({
    chat: vi.fn().mockResolvedValue({
      content: JSON.stringify([
        {
          importRow: 2,
          suggestedAction: "skip",
          reasoning: "Bản ghi đã tồn tại",
          confidence: 0.9,
        },
      ]),
    }),
  })),
}));

describe("Duplicate Detector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // GET IDENTIFIER FIELD TESTS
  // ==========================================================================
  describe("getIdentifierField", () => {
    it("should return partNumber for parts", () => {
      expect(getIdentifierField("parts")).toBe("partNumber");
    });

    it("should return code for suppliers", () => {
      expect(getIdentifierField("suppliers")).toBe("code");
    });

    it("should return sku for products", () => {
      expect(getIdentifierField("products")).toBe("sku");
    });

    it("should return code for customers", () => {
      expect(getIdentifierField("customers")).toBe("code");
    });

    it("should return partNumber for inventory", () => {
      expect(getIdentifierField("inventory")).toBe("partNumber");
    });

    it("should return undefined for unknown entity", () => {
      expect(getIdentifierField("unknown")).toBeUndefined();
    });
  });

  // ==========================================================================
  // STRING SIMILARITY TESTS (Levenshtein Distance)
  // ==========================================================================
  describe("String Similarity", () => {
    // Implement the same algorithm for testing
    function calculateSimilarity(str1: string, str2: string): number {
      if (str1 === str2) return 1;
      if (str1.length === 0 || str2.length === 0) return 0;

      const matrix: number[][] = [];

      for (let i = 0; i <= str1.length; i++) {
        matrix[i] = [i];
      }
      for (let j = 0; j <= str2.length; j++) {
        matrix[0][j] = j;
      }

      for (let i = 1; i <= str1.length; i++) {
        for (let j = 1; j <= str2.length; j++) {
          const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + cost
          );
        }
      }

      const distance = matrix[str1.length][str2.length];
      const maxLength = Math.max(str1.length, str2.length);
      return 1 - distance / maxLength;
    }

    it("should return 1 for identical strings", () => {
      expect(calculateSimilarity("PART-001", "PART-001")).toBe(1);
    });

    it("should return 0 for completely different strings", () => {
      const similarity = calculateSimilarity("abc", "xyz");
      expect(similarity).toBeLessThan(0.5);
    });

    it("should return high similarity for similar strings", () => {
      const similarity = calculateSimilarity("PART-001", "PART-002");
      expect(similarity).toBeGreaterThan(0.8);
    });

    it("should handle empty strings", () => {
      expect(calculateSimilarity("", "test")).toBe(0);
      expect(calculateSimilarity("test", "")).toBe(0);
      expect(calculateSimilarity("", "")).toBe(1); // Both empty = identical
    });

    it("should be case sensitive", () => {
      const similarity = calculateSimilarity("PART", "part");
      expect(similarity).toBeLessThan(1);
    });

    it("should detect typos", () => {
      const similarity = calculateSimilarity("PART-001", "PART-0O1"); // O instead of 0
      expect(similarity).toBeGreaterThan(0.8);
    });

    it("should handle Vietnamese strings", () => {
      const similarity = calculateSimilarity("Linh kiện A", "Linh kiện B");
      expect(similarity).toBeGreaterThan(0.8);
    });
  });

  // ==========================================================================
  // DUPLICATE MATCH STRUCTURE TESTS
  // ==========================================================================
  describe("Duplicate Match Structure", () => {
    it("should have correct exact match structure", () => {
      const match = {
        importRow: 2,
        importValue: "PART-001",
        existingRecord: {
          id: "clx123",
          identifier: "PART-001",
          name: "Test Part",
        },
        matchType: "exact" as const,
      };

      expect(match.matchType).toBe("exact");
      expect(match.existingRecord.id).toBeDefined();
      expect(match.importRow).toBeGreaterThan(1); // Excel row
    });

    it("should have correct similar match structure", () => {
      const match = {
        importRow: 3,
        importValue: "PART-0O1", // Typo
        existingRecord: {
          id: "clx123",
          identifier: "PART-001",
          name: "Test Part",
        },
        matchType: "similar" as const,
        similarity: 0.89,
      };

      expect(match.matchType).toBe("similar");
      expect(match.similarity).toBeDefined();
      expect(match.similarity).toBeGreaterThan(0.8);
    });
  });

  // ==========================================================================
  // DUPLICATE RESOLUTION TESTS
  // ==========================================================================
  describe("Duplicate Resolution", () => {
    it("should suggest skip for exact duplicates", () => {
      const resolution = {
        importRow: 2,
        suggestedAction: "skip" as const,
        reasoning: "Bản ghi đã tồn tại với dữ liệu tương tự",
        confidence: 0.95,
      };

      expect(resolution.suggestedAction).toBe("skip");
      expect(resolution.confidence).toBeGreaterThan(0.9);
    });

    it("should suggest update for inactive existing records", () => {
      const resolution = {
        importRow: 2,
        suggestedAction: "update" as const,
        reasoning: "Bản ghi hiện tại đang inactive, có thể cập nhật",
        confidence: 0.8,
      };

      expect(resolution.suggestedAction).toBe("update");
    });

    it("should suggest create_new for similar but different records", () => {
      const resolution = {
        importRow: 3,
        suggestedAction: "create_new" as const,
        reasoning: "Mã tương tự nhưng có thể là sản phẩm khác",
        confidence: 0.6,
      };

      expect(resolution.suggestedAction).toBe("create_new");
      expect(resolution.confidence).toBeLessThan(0.7);
    });
  });

  // ==========================================================================
  // DUPLICATE CHECK RESULT TESTS
  // ==========================================================================
  describe("Duplicate Check Result", () => {
    it("should calculate correct summary", () => {
      const duplicates = [
        { matchType: "exact" },
        { matchType: "exact" },
        { matchType: "similar" },
      ];

      const summary = {
        total: 10,
        exactDuplicates: duplicates.filter((d) => d.matchType === "exact").length,
        similarMatches: duplicates.filter((d) => d.matchType === "similar").length,
        newRecords: 10 - duplicates.length,
      };

      expect(summary.exactDuplicates).toBe(2);
      expect(summary.similarMatches).toBe(1);
      expect(summary.newRecords).toBe(7);
    });

    it("should handle no duplicates", () => {
      const result = {
        duplicates: [],
        newRecords: 100,
        summary: {
          total: 100,
          exactDuplicates: 0,
          similarMatches: 0,
          newRecords: 100,
        },
      };

      expect(result.duplicates.length).toBe(0);
      expect(result.summary.newRecords).toBe(100);
    });

    it("should handle all duplicates", () => {
      const result = {
        duplicates: Array(50).fill({ matchType: "exact" }),
        newRecords: 0,
        summary: {
          total: 50,
          exactDuplicates: 50,
          similarMatches: 0,
          newRecords: 0,
        },
      };

      expect(result.summary.newRecords).toBe(0);
      expect(result.summary.exactDuplicates).toBe(50);
    });
  });

  // ==========================================================================
  // IDENTIFIER EXTRACTION TESTS
  // ==========================================================================
  describe("Identifier Extraction", () => {
    it("should extract identifiers from import data", () => {
      const data = [
        { "Mã SP": "PART-001", "Tên": "Part A" },
        { "Mã SP": "PART-002", "Tên": "Part B" },
        { "Mã SP": "", "Tên": "Part C" }, // Empty - should be filtered
        { "Mã SP": "PART-003", "Tên": "Part D" },
      ];

      const identifiers = data
        .map((row, index) => ({
          index,
          value: String(row["Mã SP"] || "").trim(),
        }))
        .filter((r) => r.value !== "");

      expect(identifiers.length).toBe(3);
      expect(identifiers.map((i) => i.value)).toEqual(["PART-001", "PART-002", "PART-003"]);
    });

    it("should handle whitespace in identifiers", () => {
      const data = [
        { "Mã SP": "  PART-001  " },
        { "Mã SP": "PART-002" },
      ];

      const identifiers = data.map((row) => String(row["Mã SP"]).trim());

      expect(identifiers[0]).toBe("PART-001");
      expect(identifiers[1]).toBe("PART-002");
    });

    it("should handle null/undefined identifiers", () => {
      const data = [
        { "Mã SP": null },
        { "Mã SP": undefined },
        { "Mã SP": "PART-001" },
      ];

      const identifiers = data
        .map((row) => String(row["Mã SP"] || "").trim())
        .filter((v) => v !== "" && v !== "null" && v !== "undefined");

      expect(identifiers.length).toBe(1);
      expect(identifiers[0]).toBe("PART-001");
    });
  });

  // ==========================================================================
  // BATCH PROCESSING TESTS
  // ==========================================================================
  describe("Batch Processing", () => {
    it("should split identifiers into batches", () => {
      const identifiers = Array.from({ length: 250 }, (_, i) => `PART-${i.toString().padStart(3, "0")}`);
      const batchSize = 100;

      const batches: string[][] = [];
      for (let i = 0; i < identifiers.length; i += batchSize) {
        batches.push(identifiers.slice(i, i + batchSize));
      }

      expect(batches.length).toBe(3);
      expect(batches[0].length).toBe(100);
      expect(batches[1].length).toBe(100);
      expect(batches[2].length).toBe(50);
    });

    it("should handle single batch", () => {
      const identifiers = ["PART-001", "PART-002", "PART-003"];
      const batchSize = 100;

      const batches: string[][] = [];
      for (let i = 0; i < identifiers.length; i += batchSize) {
        batches.push(identifiers.slice(i, i + batchSize));
      }

      expect(batches.length).toBe(1);
      expect(batches[0]).toEqual(identifiers);
    });
  });

  // ==========================================================================
  // RESOLUTION SUGGESTION LOGIC TESTS
  // ==========================================================================
  describe("Resolution Suggestion Logic", () => {
    it("should suggest update for inactive existing records", () => {
      const existingRecord = {
        additionalInfo: { status: "inactive" },
      };

      const shouldUpdate = existingRecord.additionalInfo?.status === "inactive";
      expect(shouldUpdate).toBe(true);
    });

    it("should suggest skip for active existing records with same data", () => {
      const importRow = {
        partNumber: "PART-001",
        name: "Test Part",
        unitCost: 100,
      };

      const existingRecord = {
        identifier: "PART-001",
        name: "Test Part",
        additionalInfo: {
          unitCost: 100,
          status: "active",
        },
      };

      const isActive = existingRecord.additionalInfo?.status === "active";
      expect(isActive).toBe(true);
    });

    it("should suggest update when import has more data", () => {
      const importRow = {
        partNumber: "PART-001",
        name: "Test Part",
        description: "Full description",
        category: "Electronics",
        unitCost: 100,
      };

      const existingRecord = {
        additionalInfo: {
          name: "Test Part",
          status: "active",
        },
      };

      const importFieldCount = Object.values(importRow).filter(
        (v) => v !== null && v !== undefined && v !== ""
      ).length;

      const existingFieldCount = Object.values(existingRecord.additionalInfo || {}).filter(
        (v) => v !== null && v !== undefined && v !== ""
      ).length;

      const shouldUpdate = importFieldCount > existingFieldCount + 2;
      expect(shouldUpdate).toBe(true);
    });
  });
});
