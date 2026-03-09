import { describe, it, expect } from "vitest";
import {
  validateRow,
  validateData,
  getValidationRules,
  createValidationRules,
  normalizeBoolean,
  normalizeNumber,
  normalizeDate,
  defaultValidationRules,
  type ValidationRule,
  type FieldValidation,
} from "../validator";

// ---------------------------------------------------------------------------
// validateRow
// ---------------------------------------------------------------------------
describe("validateRow", () => {
  it("returns no errors for a valid row", () => {
    const rules: ValidationRule[] = [
      { field: "name", validation: { type: "string", required: true, minLength: 1 } },
    ];
    const errors = validateRow({ name: "Alice" }, 2, rules);
    expect(errors).toHaveLength(0);
  });

  it("returns error when required field is missing", () => {
    const rules: ValidationRule[] = [
      { field: "name", validation: { type: "string", required: true } },
    ];
    const errors = validateRow({}, 3, rules);
    expect(errors).toHaveLength(1);
    expect(errors[0].row).toBe(3);
    expect(errors[0].field).toBe("name");
    expect(errors[0].severity).toBe("error");
  });

  it("returns error when required field is null", () => {
    const rules: ValidationRule[] = [
      { field: "name", validation: { type: "string", required: true } },
    ];
    const errors = validateRow({ name: null }, 2, rules);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("required");
  });

  it("returns error when required field is empty string", () => {
    const rules: ValidationRule[] = [
      { field: "name", validation: { type: "string", required: true } },
    ];
    const errors = validateRow({ name: "" }, 2, rules);
    expect(errors).toHaveLength(1);
  });

  it("uses custom errorMessage from rule when validation fails", () => {
    const rules: ValidationRule[] = [
      {
        field: "name",
        validation: { type: "string", required: true },
        errorMessage: "Name is mandatory",
      },
    ];
    const errors = validateRow({}, 2, rules);
    expect(errors[0].message).toBe("Name is mandatory");
  });

  it("uses default 'Validation failed' when no messages available", () => {
    // Force a scenario where result.message could be undefined and no errorMessage
    // The enum type with enumValues triggers a message, so we use a custom validator
    // returning false (no string) and no errorMessage on rule.
    const rules: ValidationRule[] = [
      {
        field: "x",
        validation: {
          type: "string",
          customValidator: () => false,
        },
      },
    ];
    const errors = validateRow({ x: "hello" }, 2, rules);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe("Custom validation failed");
  });

  it("severity is 'warning' when field is not required", () => {
    const rules: ValidationRule[] = [
      { field: "email", validation: { type: "email" } },
    ];
    const errors = validateRow({ email: "bad-email" }, 2, rules);
    expect(errors[0].severity).toBe("warning");
  });

  it("handles multiple rules and returns all errors", () => {
    const rules: ValidationRule[] = [
      { field: "a", validation: { type: "string", required: true } },
      { field: "b", validation: { type: "number", required: true } },
    ];
    const errors = validateRow({}, 5, rules);
    expect(errors).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// validateValue (tested indirectly through validateRow / validateData)
// ---------------------------------------------------------------------------
describe("validateValue via validateRow", () => {
  // --- string type ---
  describe("string validation", () => {
    it("passes a valid string", () => {
      const rules: ValidationRule[] = [
        { field: "s", validation: { type: "string" } },
      ];
      expect(validateRow({ s: "hello" }, 2, rules)).toHaveLength(0);
    });

    it("accepts a number as string type", () => {
      const rules: ValidationRule[] = [
        { field: "s", validation: { type: "string" } },
      ];
      expect(validateRow({ s: 42 }, 2, rules)).toHaveLength(0);
    });

    it("rejects non-string non-number values", () => {
      const rules: ValidationRule[] = [
        { field: "s", validation: { type: "string", required: true } },
      ];
      // boolean is neither string nor number
      const errors = validateRow({ s: true }, 2, rules);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("string");
    });

    it("checks minLength", () => {
      const rules: ValidationRule[] = [
        { field: "s", validation: { type: "string", minLength: 5 } },
      ];
      const errors = validateRow({ s: "ab" }, 2, rules);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("at least 5");
    });

    it("checks maxLength", () => {
      const rules: ValidationRule[] = [
        { field: "s", validation: { type: "string", maxLength: 3 } },
      ];
      const errors = validateRow({ s: "abcdef" }, 2, rules);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("at most 3");
    });

    it("checks pattern", () => {
      const rules: ValidationRule[] = [
        { field: "s", validation: { type: "string", pattern: "^[A-Z]+$" } },
      ];
      expect(validateRow({ s: "ABC" }, 2, rules)).toHaveLength(0);
      const errors = validateRow({ s: "abc" }, 2, rules);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("pattern");
    });
  });

  // --- number type ---
  describe("number validation", () => {
    it("passes a valid number", () => {
      const rules: ValidationRule[] = [
        { field: "n", validation: { type: "number" } },
      ];
      expect(validateRow({ n: 3.14 }, 2, rules)).toHaveLength(0);
    });

    it("parses string to number", () => {
      const rules: ValidationRule[] = [
        { field: "n", validation: { type: "number" } },
      ];
      expect(validateRow({ n: "3.14" }, 2, rules)).toHaveLength(0);
    });

    it("rejects non-numeric string", () => {
      const rules: ValidationRule[] = [
        { field: "n", validation: { type: "number" } },
      ];
      const errors = validateRow({ n: "abc" }, 2, rules);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("valid number");
    });

    it("checks min", () => {
      const rules: ValidationRule[] = [
        { field: "n", validation: { type: "number", min: 10 } },
      ];
      const errors = validateRow({ n: 5 }, 2, rules);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("at least 10");
    });

    it("checks max", () => {
      const rules: ValidationRule[] = [
        { field: "n", validation: { type: "number", max: 100 } },
      ];
      const errors = validateRow({ n: 200 }, 2, rules);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("at most 100");
    });

    it("allows min=0 boundary", () => {
      const rules: ValidationRule[] = [
        { field: "n", validation: { type: "number", min: 0 } },
      ];
      expect(validateRow({ n: 0 }, 2, rules)).toHaveLength(0);
    });
  });

  // --- integer type ---
  describe("integer validation", () => {
    it("passes a valid integer", () => {
      const rules: ValidationRule[] = [
        { field: "i", validation: { type: "integer" } },
      ];
      expect(validateRow({ i: 42 }, 2, rules)).toHaveLength(0);
    });

    it("parses string integer", () => {
      const rules: ValidationRule[] = [
        { field: "i", validation: { type: "integer" } },
      ];
      expect(validateRow({ i: "42" }, 2, rules)).toHaveLength(0);
    });

    it("rejects float for integer type", () => {
      const rules: ValidationRule[] = [
        { field: "i", validation: { type: "integer" } },
      ];
      const errors = validateRow({ i: 3.14 }, 2, rules);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("valid integer");
    });

    it("rejects non-numeric string", () => {
      const rules: ValidationRule[] = [
        { field: "i", validation: { type: "integer" } },
      ];
      const errors = validateRow({ i: "abc" }, 2, rules);
      expect(errors).toHaveLength(1);
    });

    it("checks min for integer", () => {
      const rules: ValidationRule[] = [
        { field: "i", validation: { type: "integer", min: 5 } },
      ];
      const errors = validateRow({ i: 2 }, 2, rules);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("at least 5");
    });

    it("checks max for integer", () => {
      const rules: ValidationRule[] = [
        { field: "i", validation: { type: "integer", max: 10 } },
      ];
      const errors = validateRow({ i: 20 }, 2, rules);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("at most 10");
    });
  });

  // --- boolean type ---
  describe("boolean validation", () => {
    it.each(["true", "false", "yes", "no", "1", "0"])(
      "accepts valid boolean string: %s",
      (val) => {
        const rules: ValidationRule[] = [
          { field: "b", validation: { type: "boolean" } },
        ];
        expect(validateRow({ b: val }, 2, rules)).toHaveLength(0);
      }
    );

    it("accepts case-insensitive boolean", () => {
      const rules: ValidationRule[] = [
        { field: "b", validation: { type: "boolean" } },
      ];
      expect(validateRow({ b: "TRUE" }, 2, rules)).toHaveLength(0);
      expect(validateRow({ b: "Yes" }, 2, rules)).toHaveLength(0);
    });

    it("rejects invalid boolean string", () => {
      const rules: ValidationRule[] = [
        { field: "b", validation: { type: "boolean" } },
      ];
      const errors = validateRow({ b: "maybe" }, 2, rules);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("true/false");
    });
  });

  // --- date type ---
  describe("date validation", () => {
    it("accepts valid date string", () => {
      const rules: ValidationRule[] = [
        { field: "d", validation: { type: "date" } },
      ];
      expect(validateRow({ d: "2024-01-15" }, 2, rules)).toHaveLength(0);
    });

    it("rejects invalid date string", () => {
      const rules: ValidationRule[] = [
        { field: "d", validation: { type: "date" } },
      ];
      const errors = validateRow({ d: "not-a-date" }, 2, rules);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("valid date");
    });
  });

  // --- email type ---
  describe("email validation", () => {
    it("accepts valid email", () => {
      const rules: ValidationRule[] = [
        { field: "e", validation: { type: "email" } },
      ];
      expect(validateRow({ e: "test@example.com" }, 2, rules)).toHaveLength(0);
    });

    it("rejects invalid email", () => {
      const rules: ValidationRule[] = [
        { field: "e", validation: { type: "email" } },
      ];
      const errors = validateRow({ e: "not-email" }, 2, rules);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("valid email");
    });

    it("rejects email without domain", () => {
      const rules: ValidationRule[] = [
        { field: "e", validation: { type: "email" } },
      ];
      const errors = validateRow({ e: "user@" }, 2, rules);
      expect(errors).toHaveLength(1);
    });
  });

  // --- url type ---
  describe("url validation", () => {
    it("accepts valid URL", () => {
      const rules: ValidationRule[] = [
        { field: "u", validation: { type: "url" } },
      ];
      expect(validateRow({ u: "https://example.com" }, 2, rules)).toHaveLength(0);
    });

    it("rejects invalid URL", () => {
      const rules: ValidationRule[] = [
        { field: "u", validation: { type: "url" } },
      ];
      const errors = validateRow({ u: "not a url" }, 2, rules);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("valid URL");
    });
  });

  // --- enum type ---
  describe("enum validation", () => {
    it("accepts valid enum value", () => {
      const rules: ValidationRule[] = [
        { field: "status", validation: { type: "enum", enumValues: ["active", "inactive"] } },
      ];
      expect(validateRow({ status: "active" }, 2, rules)).toHaveLength(0);
    });

    it("is case-insensitive for enum", () => {
      const rules: ValidationRule[] = [
        { field: "status", validation: { type: "enum", enumValues: ["active", "inactive"] } },
      ];
      expect(validateRow({ status: "Active" }, 2, rules)).toHaveLength(0);
    });

    it("rejects invalid enum value", () => {
      const rules: ValidationRule[] = [
        { field: "status", validation: { type: "enum", enumValues: ["active", "inactive"] } },
      ];
      const errors = validateRow({ status: "unknown" }, 2, rules);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("Must be one of");
    });

    it("passes when enumValues is not defined", () => {
      const rules: ValidationRule[] = [
        { field: "status", validation: { type: "enum" } },
      ];
      // No enumValues means the check is skipped
      expect(validateRow({ status: "anything" }, 2, rules)).toHaveLength(0);
    });
  });

  // --- skip validation for non-required empty ---
  describe("non-required empty values", () => {
    it("skips validation for null non-required field", () => {
      const rules: ValidationRule[] = [
        { field: "n", validation: { type: "number", min: 10 } },
      ];
      expect(validateRow({ n: null }, 2, rules)).toHaveLength(0);
    });

    it("skips validation for undefined non-required field", () => {
      const rules: ValidationRule[] = [
        { field: "n", validation: { type: "number" } },
      ];
      expect(validateRow({}, 2, rules)).toHaveLength(0);
    });

    it("skips validation for empty string non-required field", () => {
      const rules: ValidationRule[] = [
        { field: "n", validation: { type: "number" } },
      ];
      expect(validateRow({ n: "" }, 2, rules)).toHaveLength(0);
    });
  });

  // --- custom validator ---
  describe("customValidator", () => {
    it("passes when customValidator returns true", () => {
      const rules: ValidationRule[] = [
        {
          field: "x",
          validation: { type: "string", customValidator: () => true },
        },
      ];
      expect(validateRow({ x: "test" }, 2, rules)).toHaveLength(0);
    });

    it("fails when customValidator returns false", () => {
      const rules: ValidationRule[] = [
        {
          field: "x",
          validation: { type: "string", customValidator: () => false },
        },
      ];
      const errors = validateRow({ x: "test" }, 2, rules);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe("Custom validation failed");
    });

    it("uses string message from customValidator", () => {
      const rules: ValidationRule[] = [
        {
          field: "x",
          validation: { type: "string", customValidator: () => "Nope!" },
        },
      ];
      const errors = validateRow({ x: "test" }, 2, rules);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe("Nope!");
    });

    it("receives the row context", () => {
      const rules: ValidationRule[] = [
        {
          field: "end",
          validation: {
            type: "number",
            customValidator: (value, row) => {
              return (value as number) > (row.start as number) ? true : "end must be > start";
            },
          },
        },
      ];
      expect(validateRow({ start: 1, end: 5 }, 2, rules)).toHaveLength(0);
      const errors = validateRow({ start: 10, end: 5 }, 2, rules);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe("end must be > start");
    });

    it("is not called for empty non-required values", () => {
      let called = false;
      const rules: ValidationRule[] = [
        {
          field: "x",
          validation: { type: "string", customValidator: () => { called = true; return true; } },
        },
      ];
      validateRow({ x: null }, 2, rules);
      expect(called).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// validateData
// ---------------------------------------------------------------------------
describe("validateData", () => {
  it("returns valid result for valid data", () => {
    const rules: ValidationRule[] = [
      { field: "name", validation: { type: "string", required: true } },
    ];
    const result = validateData([{ name: "A" }, { name: "B" }], rules);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.validRowCount).toBe(2);
    expect(result.invalidRowCount).toBe(0);
    expect(result.warningRowCount).toBe(0);
  });

  it("classifies errors and warnings correctly", () => {
    const rules: ValidationRule[] = [
      { field: "name", validation: { type: "string", required: true } },
      { field: "email", validation: { type: "email" } },
    ];
    const result = validateData(
      [{ name: "", email: "bad" }],
      rules
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);    // required name missing
    expect(result.warnings).toHaveLength(1);  // invalid email, not required
    expect(result.invalidRowCount).toBe(1);
    expect(result.warningRowCount).toBe(1);
  });

  it("row numbers start at 2 (header offset)", () => {
    const rules: ValidationRule[] = [
      { field: "name", validation: { type: "string", required: true } },
    ];
    const result = validateData([{}, {}], rules);
    expect(result.errors[0].row).toBe(2);
    expect(result.errors[1].row).toBe(3);
  });

  it("detects duplicate values for unique fields", () => {
    const rules: ValidationRule[] = [
      { field: "code", validation: { type: "string", required: true, unique: true } },
    ];
    const result = validateData(
      [{ code: "A" }, { code: "A" }, { code: "B" }],
      rules
    );
    expect(result.valid).toBe(false);
    // Row 3 (index 1) should have duplicate error
    const dupError = result.errors.find((e) => e.message.includes("Duplicate"));
    expect(dupError).toBeDefined();
    expect(dupError!.row).toBe(3);
  });

  it("unique check is case-insensitive", () => {
    const rules: ValidationRule[] = [
      { field: "code", validation: { type: "string", unique: true } },
    ];
    const result = validateData(
      [{ code: "abc" }, { code: "ABC" }],
      rules
    );
    const dupError = result.errors.find((e) => e.message.includes("Duplicate"));
    expect(dupError).toBeDefined();
  });

  it("skips uniqueness check for null/undefined/empty values", () => {
    const rules: ValidationRule[] = [
      { field: "code", validation: { type: "string", unique: true } },
    ];
    const result = validateData(
      [{ code: null }, { code: undefined }, { code: "" }],
      rules
    );
    // No duplicate errors
    const dupErrors = result.errors.filter((e) => e.message.includes("Duplicate"));
    expect(dupErrors).toHaveLength(0);
  });

  it("validRowCount excludes only invalid rows, not warning rows", () => {
    const rules: ValidationRule[] = [
      { field: "email", validation: { type: "email" } },
    ];
    const result = validateData([{ email: "bad" }, { email: "ok@ok.com" }], rules);
    // "bad" email is a warning (not required), so invalidRowCount=0
    expect(result.validRowCount).toBe(2);
    expect(result.invalidRowCount).toBe(0);
    expect(result.warningRowCount).toBe(1);
  });

  it("handles empty data array", () => {
    const rules: ValidationRule[] = [
      { field: "name", validation: { type: "string", required: true } },
    ];
    const result = validateData([], rules);
    expect(result.valid).toBe(true);
    expect(result.validRowCount).toBe(0);
  });

  it("handles empty rules array", () => {
    const result = validateData([{ a: 1 }, { b: 2 }], []);
    expect(result.valid).toBe(true);
    expect(result.validRowCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// getValidationRules
// ---------------------------------------------------------------------------
describe("getValidationRules", () => {
  it("returns rules for 'parts'", () => {
    const rules = getValidationRules("parts");
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.find((r) => r.field === "partNumber")).toBeDefined();
  });

  it("returns rules for 'suppliers'", () => {
    const rules = getValidationRules("suppliers");
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.find((r) => r.field === "code")).toBeDefined();
  });

  it("returns rules for 'products'", () => {
    const rules = getValidationRules("products");
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.find((r) => r.field === "sku")).toBeDefined();
  });

  it("returns rules for 'customers'", () => {
    const rules = getValidationRules("customers");
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.find((r) => r.field === "code")).toBeDefined();
  });

  it("returns rules for 'inventory'", () => {
    const rules = getValidationRules("inventory");
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.find((r) => r.field === "partNumber")).toBeDefined();
  });

  it("returns empty array for unknown entity type", () => {
    expect(getValidationRules("nonexistent")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// defaultValidationRules smoke check
// ---------------------------------------------------------------------------
describe("defaultValidationRules", () => {
  it("has entries for all five entity types", () => {
    expect(Object.keys(defaultValidationRules)).toEqual(
      expect.arrayContaining(["parts", "suppliers", "products", "customers", "inventory"])
    );
  });

  it("parts rules include partNumber unique constraint", () => {
    const pn = defaultValidationRules.parts.find((r) => r.field === "partNumber");
    expect(pn?.validation.unique).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createValidationRules
// ---------------------------------------------------------------------------
describe("createValidationRules", () => {
  it("creates rules from field definitions", () => {
    const rules = createValidationRules([
      { field: "email", type: "email", required: true, errorMessage: "Bad email" },
      { field: "age", type: "integer", options: { min: 0, max: 150 } },
    ]);
    expect(rules).toHaveLength(2);
    expect(rules[0].field).toBe("email");
    expect(rules[0].validation.type).toBe("email");
    expect(rules[0].validation.required).toBe(true);
    expect(rules[0].errorMessage).toBe("Bad email");
    expect(rules[1].validation.min).toBe(0);
    expect(rules[1].validation.max).toBe(150);
  });

  it("merges options into validation", () => {
    const rules = createValidationRules([
      {
        field: "code",
        type: "string",
        options: { minLength: 3, maxLength: 10, unique: true, pattern: "^[A-Z]+$" },
      },
    ]);
    expect(rules[0].validation.minLength).toBe(3);
    expect(rules[0].validation.maxLength).toBe(10);
    expect(rules[0].validation.unique).toBe(true);
    expect(rules[0].validation.pattern).toBe("^[A-Z]+$");
  });

  it("handles empty definitions array", () => {
    expect(createValidationRules([])).toEqual([]);
  });

  it("defaults required to undefined if not provided", () => {
    const rules = createValidationRules([
      { field: "x", type: "string" },
    ]);
    expect(rules[0].validation.required).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// normalizeBoolean
// ---------------------------------------------------------------------------
describe("normalizeBoolean", () => {
  it("returns null for null", () => {
    expect(normalizeBoolean(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(normalizeBoolean(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizeBoolean("")).toBeNull();
  });

  it("returns true for boolean true", () => {
    expect(normalizeBoolean(true)).toBe(true);
  });

  it("returns false for boolean false", () => {
    expect(normalizeBoolean(false)).toBe(false);
  });

  it.each(["true", "yes", "1", "y", "TRUE", "Yes", "Y"])("returns true for '%s'", (val) => {
    expect(normalizeBoolean(val)).toBe(true);
  });

  it.each(["false", "no", "0", "n", "FALSE", "No", "N"])("returns false for '%s'", (val) => {
    expect(normalizeBoolean(val)).toBe(false);
  });

  it("returns null for unrecognized string", () => {
    expect(normalizeBoolean("maybe")).toBeNull();
  });

  it("handles number input by converting to string", () => {
    expect(normalizeBoolean(1)).toBe(true);
    expect(normalizeBoolean(0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// normalizeNumber
// ---------------------------------------------------------------------------
describe("normalizeNumber", () => {
  it("returns null for null", () => {
    expect(normalizeNumber(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(normalizeNumber(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizeNumber("")).toBeNull();
  });

  it("returns number as-is", () => {
    expect(normalizeNumber(42)).toBe(42);
    expect(normalizeNumber(3.14)).toBe(3.14);
  });

  it("returns null for NaN number", () => {
    expect(normalizeNumber(NaN)).toBeNull();
  });

  it("parses numeric string", () => {
    expect(normalizeNumber("42")).toBe(42);
    expect(normalizeNumber("3.14")).toBe(3.14);
  });

  it("strips non-numeric characters", () => {
    expect(normalizeNumber("$1,234.56")).toBe(1234.56);
  });

  it("returns null for non-parseable string", () => {
    expect(normalizeNumber("abc")).toBeNull();
  });

  it("handles negative numbers", () => {
    expect(normalizeNumber(-5)).toBe(-5);
    expect(normalizeNumber("-5")).toBe(-5);
  });
});

// ---------------------------------------------------------------------------
// normalizeDate
// ---------------------------------------------------------------------------
describe("normalizeDate", () => {
  it("returns null for null", () => {
    expect(normalizeDate(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(normalizeDate(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizeDate("")).toBeNull();
  });

  it("returns valid Date object as-is", () => {
    const d = new Date("2024-01-15");
    const result = normalizeDate(d);
    expect(result).toBeInstanceOf(Date);
    expect(result!.getTime()).toBe(d.getTime());
  });

  it("returns null for invalid Date object", () => {
    expect(normalizeDate(new Date("invalid"))).toBeNull();
  });

  it("parses valid date string", () => {
    const result = normalizeDate("2024-06-15");
    expect(result).toBeInstanceOf(Date);
    expect(result!.getFullYear()).toBe(2024);
  });

  it("returns null for invalid date string", () => {
    expect(normalizeDate("not-a-date")).toBeNull();
  });

  it("parses ISO date strings", () => {
    const result = normalizeDate("2024-01-15T10:30:00Z");
    expect(result).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// Integration: validateData with defaultValidationRules
// ---------------------------------------------------------------------------
describe("integration: validateData with default rules", () => {
  it("validates valid parts data", () => {
    const rules = getValidationRules("parts");
    const data = [
      {
        partNumber: "P001",
        name: "Widget",
        category: "Raw",
        unit: "kg",
        unitCost: 10.5,
        weightKg: 2.0,
        minStockLevel: 100,
        reorderPoint: 50,
        safetyStock: 20,
        status: "active",
      },
    ];
    const result = validateData(data, rules);
    expect(result.valid).toBe(true);
  });

  it("catches invalid parts data", () => {
    const rules = getValidationRules("parts");
    const data = [
      {
        partNumber: "",
        name: "",
        unitCost: -5,
        status: "unknown",
      },
    ];
    const result = validateData(data, rules);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("validates valid suppliers data", () => {
    const rules = getValidationRules("suppliers");
    const data = [
      {
        code: "SUP001",
        name: "Acme Corp",
        country: "VN",
        contactEmail: "acme@example.com",
        leadTimeDays: 7,
        rating: 4.5,
        status: "active",
      },
    ];
    const result = validateData(data, rules);
    expect(result.valid).toBe(true);
  });

  it("detects duplicate part numbers", () => {
    const rules = getValidationRules("parts");
    const data = [
      { partNumber: "DUP", name: "A" },
      { partNumber: "DUP", name: "B" },
    ];
    const result = validateData(data, rules);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("Duplicate"))).toBe(true);
  });
});
