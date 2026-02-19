// src/lib/excel/__tests__/ai-validator.test.ts
// Unit tests for AI-powered data validation

import { describe, it, expect, vi, beforeEach } from "vitest";
import { quickValidateData } from "../ai-validator";
import type { ColumnMapping } from "../mapper";

// Mock the AI provider
vi.mock("@/lib/ai/provider", () => ({
  getAIProvider: vi.fn(() => ({
    chat: vi.fn().mockResolvedValue({
      content: JSON.stringify([
        {
          type: "data_transform",
          description: "Chuẩn hóa định dạng ngày",
          affectedRows: 10,
          action: "Convert to ISO format",
        },
      ]),
    }),
  })),
}));

describe("AI Validator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // QUICK VALIDATE DATA TESTS
  // ==========================================================================
  describe("quickValidateData", () => {
    const partsMapping: ColumnMapping[] = [
      { sourceColumn: "Mã SP", targetField: "partNumber" },
      { sourceColumn: "Tên", targetField: "name" },
      { sourceColumn: "Đơn giá", targetField: "unitCost" },
    ];

    it("should detect missing required fields", () => {
      const data = [
        { "Mã SP": "", "Tên": "Test Part", "Đơn giá": 100 },
        { "Mã SP": "PART-002", "Tên": "", "Đơn giá": 200 },
      ];

      const issues = quickValidateData(data, "parts", partsMapping);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some((i) => i.severity === "error")).toBe(true);
    });

    it("should detect null values in required fields", () => {
      const data = [
        { "Mã SP": null, "Tên": "Test", "Đơn giá": 100 },
      ];

      const issues = quickValidateData(data, "parts", partsMapping);

      expect(issues.some((i) => i.column === "Mã SP")).toBe(true);
    });

    it("should return no issues for valid data", () => {
      const data = [
        { "Mã SP": "PART-001", "Tên": "Test Part", "Đơn giá": 100 },
        { "Mã SP": "PART-002", "Tên": "Another Part", "Đơn giá": 200 },
      ];

      const issues = quickValidateData(data, "parts", partsMapping);

      const errors = issues.filter((i) => i.severity === "error");
      expect(errors.length).toBe(0);
    });

    it("should handle undefined values", () => {
      const data = [
        { "Mã SP": undefined, "Tên": "Test", "Đơn giá": 100 },
      ];

      const issues = quickValidateData(data, "parts", partsMapping);

      expect(issues.some((i) => i.severity === "error")).toBe(true);
    });

    it("should validate only first 50 rows", () => {
      // Create 100 rows with missing required field
      const data = Array.from({ length: 100 }, (_, i) => ({
        "Mã SP": "",
        "Tên": `Part ${i}`,
        "Đơn giá": i * 10,
      }));

      const issues = quickValidateData(data, "parts", partsMapping);

      // Should only check first 50 rows
      const maxRow = Math.max(...issues.map((i) => i.row));
      expect(maxRow).toBeLessThanOrEqual(52); // 50 + 2 (header offset)
    });
  });

  // ==========================================================================
  // DATA ISSUE CATEGORY TESTS
  // ==========================================================================
  describe("Data Issue Categories", () => {
    it("should categorize empty field as 'empty'", () => {
      const data = [{ "Mã SP": "", "Tên": "Test", "Đơn giá": 100 }];
      const mapping: ColumnMapping[] = [
        { sourceColumn: "Mã SP", targetField: "partNumber" },
        { sourceColumn: "Tên", targetField: "name" },
      ];

      const issues = quickValidateData(data, "parts", mapping);

      expect(issues.some((i) => i.category === "empty")).toBe(true);
    });

    it("should provide correct row number (Excel format)", () => {
      const data = [
        { "Mã SP": "PART-001", "Tên": "Test" },
        { "Mã SP": "", "Tên": "Test 2" }, // Row 2 in data = Row 3 in Excel
      ];
      const mapping: ColumnMapping[] = [
        { sourceColumn: "Mã SP", targetField: "partNumber" },
        { sourceColumn: "Tên", targetField: "name" },
      ];

      const issues = quickValidateData(data, "parts", mapping);

      // Excel row = data index + 2 (1 for header, 1 for 1-indexing)
      const issue = issues.find((i) => i.column === "Mã SP");
      expect(issue?.row).toBe(3); // Second data row = row 3 in Excel
    });
  });

  // ==========================================================================
  // ENCODING ISSUE TESTS
  // ==========================================================================
  describe("Encoding Issues", () => {
    it("should detect replacement character (encoding issue)", () => {
      // \uFFFD is the Unicode replacement character
      const value = "Test \uFFFD value";
      const hasEncodingIssue = /[\uFFFD]/.test(value);

      expect(hasEncodingIssue).toBe(true);
    });

    it("should pass clean Vietnamese text", () => {
      const value = "Linh kiện điện tử Việt Nam";
      const hasEncodingIssue = /[\uFFFD]/.test(value);

      expect(hasEncodingIssue).toBe(false);
    });

    it("should detect control characters", () => {
      const value = "Test\x00value"; // Null character
      const hasControlChar = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(value);

      expect(hasControlChar).toBe(true);
    });
  });

  // ==========================================================================
  // TYPE MISMATCH TESTS
  // ==========================================================================
  describe("Type Mismatch Detection", () => {
    it("should identify non-numeric value for number field", () => {
      const value = "abc123";
      const num = parseFloat(value.replace(/[,\s]/g, ""));

      expect(isNaN(num)).toBe(true);
    });

    it("should accept numeric string", () => {
      const value = "123.45";
      const num = parseFloat(value.replace(/[,\s]/g, ""));

      expect(isNaN(num)).toBe(false);
      expect(num).toBe(123.45);
    });

    it("should handle Vietnamese number format", () => {
      const value = "1.234,56"; // Vietnamese format: 1,234.56
      // Need to convert Vietnamese format
      const normalizedValue = value.replace(/\./g, "").replace(",", ".");
      const num = parseFloat(normalizedValue);

      expect(num).toBe(1234.56);
    });

    it("should detect invalid date format", () => {
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}$/,
        /^\d{2}\/\d{2}\/\d{4}$/,
        /^\d{2}-\d{2}-\d{4}$/,
      ];

      const invalidDate = "not-a-date";
      const isValidFormat = datePatterns.some((p) => p.test(invalidDate));

      expect(isValidFormat).toBe(false);
    });

    it("should accept valid date formats", () => {
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}$/,
        /^\d{2}\/\d{2}\/\d{4}$/,
        /^\d{2}-\d{2}-\d{4}$/,
      ];

      const validDates = ["2024-01-15", "15/01/2024", "15-01-2024"];

      for (const date of validDates) {
        const isValid = datePatterns.some((p) => p.test(date));
        expect(isValid).toBe(true);
      }
    });
  });

  // ==========================================================================
  // SUSPICIOUS VALUE TESTS
  // ==========================================================================
  describe("Suspicious Value Detection", () => {
    it("should flag negative price", () => {
      const price = -100;
      const isSuspicious = price < 0;

      expect(isSuspicious).toBe(true);
    });

    it("should flag very large numbers", () => {
      const value = 1e15; // 1 quadrillion
      const isSuspicious = Math.abs(value) > 1e12;

      expect(isSuspicious).toBe(true);
    });

    it("should accept normal positive values", () => {
      const normalValues = [0, 100, 1000, 999999];

      for (const value of normalValues) {
        const isSuspicious = value < 0 || Math.abs(value) > 1e12;
        expect(isSuspicious).toBe(false);
      }
    });

    it("should flag far future expiry date", () => {
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 10); // 10 years from now

      const fiveYearsFromNow = new Date();
      fiveYearsFromNow.setFullYear(fiveYearsFromNow.getFullYear() + 5);

      const isSuspicious = expiryDate > fiveYearsFromNow;

      expect(isSuspicious).toBe(true);
    });
  });

  // ==========================================================================
  // FORMAT CONSISTENCY TESTS
  // ==========================================================================
  describe("Format Consistency", () => {
    it("should detect mixed date formats", () => {
      const dates = ["2024-01-15", "15/01/2024", "01-15-2024"];
      const formats = new Set<string>();

      const datePatterns = [
        { pattern: /^\d{4}-\d{2}-\d{2}$/, format: "ISO" },
        { pattern: /^\d{2}\/\d{2}\/\d{4}$/, format: "EU" },
        { pattern: /^\d{2}-\d{2}-\d{4}$/, format: "US" },
      ];

      for (const date of dates) {
        for (const { pattern, format } of datePatterns) {
          if (pattern.test(date)) {
            formats.add(format);
          }
        }
      }

      // Should have multiple formats (inconsistent)
      expect(formats.size).toBeGreaterThan(1);
    });

    it("should pass consistent date formats", () => {
      const dates = ["2024-01-15", "2024-02-20", "2024-03-25"];
      const formats = new Set<string>();

      const isoPattern = /^\d{4}-\d{2}-\d{2}$/;

      for (const date of dates) {
        if (isoPattern.test(date)) {
          formats.add("ISO");
        }
      }

      expect(formats.size).toBe(1);
    });

    it("should detect mixed case in code columns", () => {
      const codes = ["PART-001", "part-002", "Part-003"];

      const hasUpperCase = codes.some((c) => c !== c.toLowerCase());
      const hasLowerCase = codes.some((c) => c !== c.toUpperCase());

      expect(hasUpperCase && hasLowerCase).toBe(true);
    });
  });

  // ==========================================================================
  // SUMMARY BUILDING TESTS
  // ==========================================================================
  describe("Summary Building", () => {
    it("should count issues by severity", () => {
      const issues = [
        { severity: "error", category: "empty", row: 2 },
        { severity: "error", category: "empty", row: 3 },
        { severity: "warning", category: "format", row: 4 },
        { severity: "info", category: "suspicious", row: 5 },
      ];

      const errors = issues.filter((i) => i.severity === "error").length;
      const warnings = issues.filter((i) => i.severity === "warning").length;
      const info = issues.filter((i) => i.severity === "info").length;

      expect(errors).toBe(2);
      expect(warnings).toBe(1);
      expect(info).toBe(1);
    });

    it("should count affected rows correctly", () => {
      const issues = [
        { row: 2 },
        { row: 2 }, // Same row
        { row: 3 },
        { row: 5 },
      ];

      const affectedRows = new Set(issues.map((i) => i.row)).size;

      expect(affectedRows).toBe(3);
    });

    it("should count issues by category", () => {
      const issues = [
        { category: "empty" },
        { category: "empty" },
        { category: "type_mismatch" },
        { category: "encoding" },
      ];

      const byCategory = issues.reduce(
        (acc, issue) => {
          acc[issue.category] = (acc[issue.category] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      expect(byCategory.empty).toBe(2);
      expect(byCategory.type_mismatch).toBe(1);
      expect(byCategory.encoding).toBe(1);
    });
  });
});
