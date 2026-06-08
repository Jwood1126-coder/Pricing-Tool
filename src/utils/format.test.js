import { describe, it, expect } from "vitest";
import { csvSafe, toCSV, fmtSell, parseNumeric, parseQty } from "./format.js";

describe("csvSafe", () => {
  it("PRESERVES hyphens in part numbers (the original bug)", () => {
    expect(csvSafe("BRN-4820-SS")).toBe("BRN-4820-SS");
  });
  it("leaves plain values untouched", () => {
    expect(csvSafe("hello")).toBe("hello");
    expect(csvSafe(42)).toBe("42");
  });
  it("quotes and escapes fields with commas, quotes, or newlines", () => {
    expect(csvSafe("a,b")).toBe('"a,b"');
    expect(csvSafe('say "hi"')).toBe('"say ""hi"""');
    expect(csvSafe("line1\nline2")).toBe('"line1\nline2"');
  });
  it("handles null/undefined as empty string", () => {
    expect(csvSafe(null)).toBe("");
    expect(csvSafe(undefined)).toBe("");
  });
});

describe("toCSV", () => {
  it("builds a header + rows, escaping each cell", () => {
    const csv = toCSV(["Part", "Desc"], [["BRN-1-A", "Bolt, hex"]]);
    expect(csv).toBe('Part,Desc\nBRN-1-A,"Bolt, hex"');
  });
});

describe("fmtSell", () => {
  it("formats to 4 decimals with a dollar sign", () => {
    expect(fmtSell(1.5)).toBe("$1.5000");
  });
});

describe("parseNumeric (real-world cost cells)", () => {
  it("handles currency symbols and thousands separators", () => {
    expect(parseNumeric("$1,234.56")).toBeCloseTo(1234.56);
    expect(parseNumeric("$5,432.10")).toBeCloseTo(5432.1);
    expect(parseNumeric(" 12.5 ")).toBeCloseTo(12.5);
    expect(parseNumeric("10.50 USD")).toBeCloseTo(10.5);
  });
  it("returns null for blank/garbage (distinct from 0)", () => {
    expect(parseNumeric("")).toBeNull();
    expect(parseNumeric("   ")).toBeNull();
    expect(parseNumeric("N/A")).toBeNull();
    expect(parseNumeric(null)).toBeNull();
    expect(parseNumeric(undefined)).toBeNull();
  });
  it("preserves a real zero", () => {
    expect(parseNumeric("0")).toBe(0);
    expect(parseNumeric(0)).toBe(0);
  });
  it("passes through numbers", () => {
    expect(parseNumeric(3.14)).toBeCloseTo(3.14);
  });
});

describe("parseQty (real-world quantity cells)", () => {
  it("handles thousands separators and whitespace", () => {
    expect(parseQty("10,000")).toBe(10000);
    expect(parseQty(" 500 ")).toBe(500);
    expect(parseQty("500 ea")).toBe(500);
  });
  it("returns null for blank/non-numeric", () => {
    expect(parseQty("")).toBeNull();
    expect(parseQty("abc")).toBeNull();
    expect(parseQty(null)).toBeNull();
  });
  it("passes through integers and truncates floats", () => {
    expect(parseQty(42)).toBe(42);
    expect(parseQty(42.9)).toBe(42);
  });
});
