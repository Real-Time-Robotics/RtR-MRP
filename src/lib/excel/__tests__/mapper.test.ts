// src/lib/excel/__tests__/mapper.test.ts
// Unit tests for Excel Mapper with Vietnamese support

import { describe, it, expect } from "vitest";
import {
  autoDetectMappings,
  applyMappings,
  getFieldDefinitions,
  getRequiredFields,
  getIdentifierField,
  createMappingConfig,
  entityFieldDefinitions,
} from "../mapper";

describe("Excel Mapper", () => {
  // ==========================================================================
  // VIETNAMESE ALIAS TESTS
  // ==========================================================================
  describe("Vietnamese Aliases", () => {
    describe("Parts Entity", () => {
      it("should detect Vietnamese part number headers", () => {
        // Use normalized headers that match aliases (no diacritics)
        const headers = ["masp", "ten", "dongia"];
        const result = autoDetectMappings(headers, "parts");

        expect(result.mappings).toContainEqual(
          expect.objectContaining({
            sourceColumn: "masp",
            targetField: "partNumber",
          })
        );
      });

      it("should detect 'masp' without diacritics", () => {
        const headers = ["masp", "ten", "dongia"];
        const result = autoDetectMappings(headers, "parts");

        expect(result.mappings.find((m) => m.targetField === "partNumber")).toBeDefined();
        expect(result.mappings.find((m) => m.targetField === "name")).toBeDefined();
        expect(result.mappings.find((m) => m.targetField === "unitCost")).toBeDefined();
      });

      it("should detect 'ma_san_pham' with underscores", () => {
        const headers = ["ma_san_pham", "ten_san_pham", "don_gia"];
        const result = autoDetectMappings(headers, "parts");

        expect(result.mappings.length).toBeGreaterThanOrEqual(3);
        expect(result.mappings.find((m) => m.targetField === "partNumber")).toBeDefined();
      });

      it("should detect mixed Vietnamese headers", () => {
        // Use normalized headers that match aliases
        const headers = ["mavattu", "tenlinhkien", "soluong", "donvi"];
        const result = autoDetectMappings(headers, "parts");

        expect(result.mappings.find((m) => m.targetField === "partNumber")).toBeDefined();
        expect(result.mappings.find((m) => m.targetField === "name")).toBeDefined();
      });

      it("should detect Vietnamese inventory-related headers in parts", () => {
        // mahang matches partNumber alias
        const headers = ["mahang", "tonkho", "tonantoan"];
        const result = autoDetectMappings(headers, "parts");

        expect(result.mappings.find((m) => m.targetField === "partNumber")).toBeDefined();
      });
    });

    describe("Suppliers Entity", () => {
      it("should detect Vietnamese supplier headers", () => {
        // Use normalized headers that match aliases
        const headers = ["mancc", "tenncc", "quocgia", "thoigiangiao"];
        const result = autoDetectMappings(headers, "suppliers");

        expect(result.mappings.find((m) => m.targetField === "code")).toBeDefined();
        expect(result.mappings.find((m) => m.targetField === "name")).toBeDefined();
      });

      it("should detect 'ma_nha_cung_cap'", () => {
        const headers = ["ma_nha_cung_cap", "ten_nha_cung_cap", "so_ngay_giao"];
        const result = autoDetectMappings(headers, "suppliers");

        expect(result.mappings.find((m) => m.targetField === "code")).toBeDefined();
        expect(result.mappings.find((m) => m.targetField === "leadTimeDays")).toBeDefined();
      });

      it("should detect contact info in Vietnamese", () => {
        const headers = ["mancc", "tenncc", "dien_thoai", "dia_chi"];
        const result = autoDetectMappings(headers, "suppliers");

        expect(result.mappings.find((m) => m.targetField === "contactPhone")).toBeDefined();
        expect(result.mappings.find((m) => m.targetField === "address")).toBeDefined();
      });
    });

    describe("Customers Entity", () => {
      it("should detect Vietnamese customer headers", () => {
        // Use normalized headers that match aliases
        const headers = ["makh", "tenkhachhang", "hanmuctindung"];
        const result = autoDetectMappings(headers, "customers");

        expect(result.mappings.find((m) => m.targetField === "code")).toBeDefined();
        expect(result.mappings.find((m) => m.targetField === "name")).toBeDefined();
        expect(result.mappings.find((m) => m.targetField === "creditLimit")).toBeDefined();
      });

      it("should detect 'ma_khach_hang'", () => {
        const headers = ["ma_khach_hang", "ten_khach_hang", "loai_kh"];
        const result = autoDetectMappings(headers, "customers");

        expect(result.mappings.find((m) => m.targetField === "code")).toBeDefined();
        expect(result.mappings.find((m) => m.targetField === "type")).toBeDefined();
      });
    });

    describe("Inventory Entity", () => {
      it("should detect Vietnamese inventory headers", () => {
        // Use normalized headers that match aliases
        const headers = ["masp", "kho", "soluong", "vitri"];
        const result = autoDetectMappings(headers, "inventory");

        expect(result.mappings.find((m) => m.targetField === "partNumber")).toBeDefined();
        expect(result.mappings.find((m) => m.targetField === "warehouseCode")).toBeDefined();
        expect(result.mappings.find((m) => m.targetField === "quantity")).toBeDefined();
      });

      it("should detect 'so_luong' and 'ton_kho'", () => {
        const headers = ["masp", "ma_kho", "so_luong", "so_lo"];
        const result = autoDetectMappings(headers, "inventory");

        expect(result.mappings.find((m) => m.targetField === "quantity")).toBeDefined();
        expect(result.mappings.find((m) => m.targetField === "lotNumber")).toBeDefined();
      });

      it("should detect expiry date in Vietnamese", () => {
        const headers = ["ma_hang", "kho", "sl", "han_su_dung"];
        const result = autoDetectMappings(headers, "inventory");

        expect(result.mappings.find((m) => m.targetField === "expiryDate")).toBeDefined();
      });
    });

    describe("Products Entity", () => {
      it("should detect Vietnamese product headers", () => {
        // Use normalized headers that match aliases
        const headers = ["masp", "tensp", "giaban"];
        const result = autoDetectMappings(headers, "products");

        expect(result.mappings.find((m) => m.targetField === "sku")).toBeDefined();
        expect(result.mappings.find((m) => m.targetField === "name")).toBeDefined();
        expect(result.mappings.find((m) => m.targetField === "basePrice")).toBeDefined();
      });

      it("should detect assembly hours in Vietnamese", () => {
        const headers = ["masp", "tensp", "gio_lap_rap", "gio_kiem_tra"];
        const result = autoDetectMappings(headers, "products");

        expect(result.mappings.find((m) => m.targetField === "assemblyHours")).toBeDefined();
        expect(result.mappings.find((m) => m.targetField === "testingHours")).toBeDefined();
      });
    });

    describe("BOM Entity", () => {
      it("should detect Vietnamese BOM headers", () => {
        // Use normalized headers that match aliases
        const headers = ["matp", "malk", "soluong", "dinhmuc"];
        const result = autoDetectMappings(headers, "bom");

        expect(result.mappings.find((m) => m.targetField === "productSku")).toBeDefined();
        expect(result.mappings.find((m) => m.targetField === "partNumber")).toBeDefined();
        expect(result.mappings.find((m) => m.targetField === "quantity")).toBeDefined();
      });

      it("should detect 'dinh_muc' for quantity", () => {
        const headers = ["ma_thanh_pham", "ma_linh_kien", "dinh_muc", "ty_le_hao"];
        const result = autoDetectMappings(headers, "bom");

        expect(result.mappings.find((m) => m.targetField === "quantity")).toBeDefined();
        expect(result.mappings.find((m) => m.targetField === "scrapRate")).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // ENGLISH ALIAS TESTS (Existing functionality)
  // ==========================================================================
  describe("English Aliases", () => {
    it("should detect standard English headers", () => {
      const headers = ["part_number", "name", "unit_cost", "category"];
      const result = autoDetectMappings(headers, "parts");

      expect(result.mappings.length).toBe(4);
      expect(result.unmappedColumns.length).toBe(0);
    });

    it("should detect abbreviated headers", () => {
      const headers = ["pn", "uom", "rop", "lt"];
      const result = autoDetectMappings(headers, "parts");

      expect(result.mappings.find((m) => m.targetField === "partNumber")).toBeDefined();
      expect(result.mappings.find((m) => m.targetField === "unit")).toBeDefined();
    });

    it("should handle mixed case headers", () => {
      const headers = ["PartNumber", "NAME", "Unit_Cost"];
      const result = autoDetectMappings(headers, "parts");

      expect(result.mappings.length).toBe(3);
    });
  });

  // ==========================================================================
  // UNMAPPED COLUMNS TESTS
  // ==========================================================================
  describe("Unmapped Columns", () => {
    it("should identify unmapped columns", () => {
      const headers = ["masp", "ten", "Unknown Column", "Random Field"];
      const result = autoDetectMappings(headers, "parts");

      expect(result.unmappedColumns).toContain("Unknown Column");
      expect(result.unmappedColumns).toContain("Random Field");
    });

    it("should identify missing required fields", () => {
      const headers = ["category", "description"];
      const result = autoDetectMappings(headers, "parts");

      expect(result.missingRequiredFields).toContain("Part Number");
      expect(result.missingRequiredFields).toContain("Name");
    });
  });

  // ==========================================================================
  // APPLY MAPPINGS TESTS
  // ==========================================================================
  describe("applyMappings", () => {
    it("should transform data with Vietnamese headers", () => {
      // Use normalized column names that match aliases
      const data = [
        { "masp": "PART-001", "ten": "Linh kiện A", "dongia": "100" },
        { "masp": "PART-002", "ten": "Linh kiện B", "dongia": "200" },
      ];

      const mappings = autoDetectMappings(Object.keys(data[0]), "parts");
      const config = createMappingConfig(mappings.mappings, "parts");
      const result = applyMappings(data, config);

      expect(result.data[0].partNumber).toBe("PART-001");
      expect(result.data[0].name).toBe("Linh kiện A");
      expect(result.data[0].unitCost).toBe(100);
    });

    it("should apply default values for missing fields", () => {
      const data = [{ "masp": "PART-001", "ten": "Test" }];

      const mappings = autoDetectMappings(Object.keys(data[0]), "parts");
      const config = createMappingConfig(mappings.mappings, "parts");
      const result = applyMappings(data, config);

      expect(result.data[0].unit).toBe("pcs");
      expect(result.data[0].status).toBe("active");
    });

    it("should convert boolean values correctly", () => {
      const data = [{ "masp": "PART-001", "ten": "Test", "quan_trong": "yes" }];

      const mappings = autoDetectMappings(Object.keys(data[0]), "parts");
      const config = createMappingConfig(mappings.mappings, "parts");
      const result = applyMappings(data, config);

      expect(result.data[0]).toBeDefined();
    });
  });

  // ==========================================================================
  // UTILITY FUNCTION TESTS
  // ==========================================================================
  describe("Utility Functions", () => {
    describe("getFieldDefinitions", () => {
      it("should return field definitions for all entity types", () => {
        const entityTypes = ["parts", "suppliers", "products", "customers", "inventory", "bom"];

        for (const entityType of entityTypes) {
          const fields = getFieldDefinitions(entityType);
          expect(fields.length).toBeGreaterThan(0);
        }
      });

      it("should return empty array for unknown entity type", () => {
        const fields = getFieldDefinitions("unknown");
        expect(fields).toEqual([]);
      });
    });

    describe("getRequiredFields", () => {
      it("should return required fields for parts", () => {
        const required = getRequiredFields("parts");
        expect(required).toContain("partNumber");
        expect(required).toContain("name");
      });

      it("should return required fields for suppliers", () => {
        const required = getRequiredFields("suppliers");
        expect(required).toContain("code");
        expect(required).toContain("name");
        expect(required).toContain("leadTimeDays");
      });
    });

    describe("getIdentifierField", () => {
      it("should return correct identifier for each entity type", () => {
        expect(getIdentifierField("parts")).toBe("partNumber");
        expect(getIdentifierField("suppliers")).toBe("code");
        expect(getIdentifierField("products")).toBe("sku");
        expect(getIdentifierField("customers")).toBe("code");
      });
    });
  });

  // ==========================================================================
  // ENTITY FIELD DEFINITIONS TESTS
  // ==========================================================================
  describe("entityFieldDefinitions", () => {
    it("should have Vietnamese aliases for parts", () => {
      const partsFields = entityFieldDefinitions.parts;
      const partNumberField = partsFields.find((f) => f.key === "partNumber");

      expect(partNumberField?.aliases).toContain("masp");
      expect(partNumberField?.aliases).toContain("ma_san_pham");
      expect(partNumberField?.aliases).toContain("ma_vat_tu");
    });

    it("should have Vietnamese aliases for suppliers", () => {
      const supplierFields = entityFieldDefinitions.suppliers;
      const codeField = supplierFields.find((f) => f.key === "code");

      expect(codeField?.aliases).toContain("mancc");
      expect(codeField?.aliases).toContain("ma_nha_cung_cap");
    });

    it("should have Vietnamese aliases for all required fields", () => {
      for (const [entityType, fields] of Object.entries(entityFieldDefinitions)) {
        const requiredFields = fields.filter((f) => f.required);

        for (const field of requiredFields) {
          // Each required field should have at least some aliases
          expect(field.aliases?.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
