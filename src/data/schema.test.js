import { describe, it, expect } from "vitest";
import { normalizeRow } from "./schema.js";
import { buildScenario, totalInv } from "../utils/pricing.js";

// Integration test: a row shaped exactly like PapaParse produces from a real,
// messy uploaded CSV (currency symbols, thousands commas, mixed-case part number)
// -> normalizeRow -> buildScenario. Proves "upload data and it works" end to end
// at the data/logic level.
describe("upload pipeline (messy real CSV -> correct pricing)", () => {
  const mapping = { partNum: "Item", desc: "Name", avgCost: "AvgCost", repCost: "RepCost" };
  const locationCols = ["PC10", "PC20"];

  it("parses currency/comma costs and inventory, then prices correctly", () => {
    const csvRow = {
      Item: "brn-4820-ss",
      Name: "Stainless Hex Bolt",
      AvgCost: "$5,432.10",
      RepCost: "$6,000.00",
      PC10: "10,000",
      PC20: "5,000",
    };
    const rec = normalizeRow("parts", csvRow, mapping, locationCols);

    expect(rec.partNum).toBe("BRN-4820-SS");      // upper-cased for lookup
    expect(rec.avgCost).toBeCloseTo(5432.1);       // "$5,432.10" parsed, not 0
    expect(rec.repCost).toBeCloseTo(6000);
    expect(totalInv(rec.inventory)).toBe(15000);   // "10,000" + "5,000", not 15

    // spot buy, qty 1000: inv 15000/1000 = 1500% >= 70% -> Average Cost
    const sc = buildScenario(rec, "spot", "1000");
    expect(sc.noCost).toBe(false);
    expect(sc.cost).toBeCloseTo(5432.1);
    expect(sc.scenario).toMatch(/Average Cost/);
  });

  it("flags a part with blank costs as No Cost (not a $0 quote)", () => {
    const rec = normalizeRow("parts", { Item: "X-1", Name: "Thing", AvgCost: "", RepCost: "" }, mapping, locationCols);
    expect(rec.avgCost).toBeNull();
    expect(buildScenario(rec, "spot", "10").noCost).toBe(true);
  });

  it("drops rows with an empty key field (handled by importDataset filter)", () => {
    const rec = normalizeRow("parts", { Item: "", Name: "no id", AvgCost: "1.00", RepCost: "2.00" }, mapping, []);
    expect(rec.partNum).toBe(""); // importDataset filters these out
  });

  it("normalizes a user row and derives role + initials", () => {
    const u = normalizeRow("users", { FullName: "Jane Doe", Role: "Admin" }, { name: "FullName", role: "Role" });
    expect(u.role).toBe("admin");
    expect(u.initials).toBe("JD");
    expect(u.id).toBeTruthy();
  });
});
