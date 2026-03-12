import { describe, it, expect } from "vitest";
import {
  normalizeVietnamese,
  isVietnameseText,
  findBestMatch,
  detectEntityType,
  autoMapHeaders,
  getVietnameseLabel,
  getHeaderAliases,
  getAllAliases,
} from "../vietnamese-headers";

describe("normalizeVietnamese", () => {
  it("lowercases and trims", () => {
    expect(normalizeVietnamese("  HELLO  ")).toBe("hello");
  });

  it("removes diacritics", () => {
    expect(normalizeVietnamese("Mã sản phẩm")).toBe("ma san pham");
  });

  it("handles đ character", () => {
    expect(normalizeVietnamese("Đơn vị tính")).toBe("don vi tinh");
  });

  it("normalizes whitespace", () => {
    expect(normalizeVietnamese("a   b  c")).toBe("a b c");
  });

  it("returns empty for empty input", () => {
    expect(normalizeVietnamese("")).toBe("");
  });

  it("removes special characters", () => {
    expect(normalizeVietnamese("test (code)")).toBe("test code");
  });
});

describe("isVietnameseText", () => {
  it("detects Vietnamese characters", () => {
    expect(isVietnameseText("Mã sản phẩm")).toBe(true);
    expect(isVietnameseText("đơn vị")).toBe(true);
    expect(isVietnameseText("tồn kho")).toBe(true);
  });

  it("returns false for plain English", () => {
    expect(isVietnameseText("part number")).toBe(false);
    expect(isVietnameseText("SKU")).toBe(false);
  });
});

describe("findBestMatch", () => {
  it("exact match returns confidence 1.0", () => {
    const match = findBestMatch("part number");
    expect(match).not.toBeNull();
    expect(match!.field).toBe("partNumber");
    expect(match!.confidence).toBe(1.0);
  });

  it("Vietnamese header matches", () => {
    const match = findBestMatch("Mã sản phẩm");
    expect(match).not.toBeNull();
    expect(match!.field).toBe("partNumber");
  });

  it("returns null for unrecognized header", () => {
    const match = findBestMatch("xyzabc123");
    expect(match).toBeNull();
  });

  it("scopes to entity type when specified", () => {
    const match = findBestMatch("tên", "suppliers");
    // "tên" could match parts.name or suppliers fields
    expect(match).not.toBeNull();
  });

  it("returns null for empty string", () => {
    const match = findBestMatch("");
    expect(match).toBeNull();
  });

  it("matches supplier fields", () => {
    const match = findBestMatch("nhà cung cấp", "suppliers");
    expect(match).not.toBeNull();
    expect(match!.field).toBe("supplierName");
  });
});

describe("detectEntityType", () => {
  it("detects parts from typical headers", () => {
    const result = detectEntityType(["part number", "name", "unit cost", "category"]);
    expect(result.type).toBe("parts");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("detects suppliers from supplier headers", () => {
    const result = detectEntityType(["supplier name", "contact name", "phone", "email"]);
    expect(result.type).toBe("suppliers");
  });

  it("detects BOM from bom headers", () => {
    const result = detectEntityType(["parent part", "child part", "quantity"]);
    expect(result.type).toBe("bom");
  });

  it("returns unknown for unrecognized headers", () => {
    const result = detectEntityType(["xyz", "abc", "def"]);
    expect(result.type).toBe("unknown");
    expect(result.confidence).toBe(0);
  });

  it("detects Vietnamese headers", () => {
    const result = detectEntityType(["mã sp", "tên sản phẩm", "đơn giá", "tồn kho"]);
    expect(result.type).toBe("parts");
  });
});

describe("autoMapHeaders", () => {
  it("maps headers to fields without duplicates", () => {
    const mappings = autoMapHeaders(
      ["part number", "name", "category"],
      "parts"
    );
    expect(mappings.size).toBe(3);
    expect(mappings.get("part number")!.field).toBe("partNumber");
    expect(mappings.get("name")!.field).toBe("name");
    expect(mappings.get("category")!.field).toBe("category");
  });

  it("prevents duplicate field mappings", () => {
    const mappings = autoMapHeaders(
      ["sku", "part number"],
      "parts"
    );
    // Both could match partNumber, but only one should
    const fields = [...mappings.values()].map((m) => m.field);
    const uniqueFields = new Set(fields);
    expect(uniqueFields.size).toBe(fields.length);
  });

  it("skips unmatchable headers", () => {
    const mappings = autoMapHeaders(
      ["part number", "unknown_column", "name"],
      "parts"
    );
    expect(mappings.has("unknown_column")).toBe(false);
    expect(mappings.size).toBe(2);
  });
});

describe("getVietnameseLabel", () => {
  it("returns Vietnamese label for known fields", () => {
    expect(getVietnameseLabel("partNumber")).toBe("Mã sản phẩm");
    expect(getVietnameseLabel("name")).toBe("Tên");
    expect(getVietnameseLabel("unitCost")).toBe("Đơn giá nhập");
    expect(getVietnameseLabel("supplierName")).toBe("Tên nhà cung cấp");
  });

  it("returns null for unknown fields", () => {
    expect(getVietnameseLabel("unknownField")).toBeNull();
  });
});

describe("getHeaderAliases", () => {
  it("returns map for parts entity", () => {
    const aliases = getHeaderAliases("parts");
    expect(aliases.has("partNumber")).toBe(true);
    expect(aliases.get("partNumber")!.length).toBeGreaterThan(5);
  });

  it("returns empty map for unknown entity", () => {
    const aliases = getHeaderAliases("nonexistent");
    expect(aliases.size).toBe(0);
  });
});

describe("getAllAliases", () => {
  it("returns a map with normalized aliases", () => {
    const aliases = getAllAliases();
    expect(aliases.size).toBeGreaterThan(50);
    // Check a normalized Vietnamese alias
    expect(aliases.has("ma san pham")).toBe(true);
  });
});
