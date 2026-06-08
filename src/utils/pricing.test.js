import { describe, it, expect } from "vitest";
import { buildScenario, calcSell, totalInv } from "./pricing.js";

const part = (over = {}) => ({ desc: "x", avgCost: 1, repCost: 2, inventory: { A: 50, B: 50 }, ...over });

describe("totalInv", () => {
  it("sums inventory across locations", () => {
    expect(totalInv({ A: 10, B: 5, C: 0 })).toBe(15);
  });
  it("handles missing/garbage inventory", () => {
    expect(totalInv(null)).toBe(0);
    expect(totalInv({ A: "3", B: undefined })).toBe(3);
  });
});

describe("calcSell", () => {
  it("computes sell price from cost and margin", () => {
    expect(calcSell(10, 0.5)).toBe(20);
    expect(calcSell(6, 0.4)).toBeCloseTo(10);
  });
  it("returns null for out-of-range margins", () => {
    expect(calcSell(10, 0)).toBeNull();
    expect(calcSell(10, 1)).toBeNull();
    expect(calcSell(10, 1.2)).toBeNull();
  });
});

describe("buildScenario", () => {
  it("flags parts with no cost on record", () => {
    const r = buildScenario(part({ avgCost: 0, repCost: 0 }), "spot", 10);
    expect(r.noCost).toBe(true);
  });

  it("uses replacement cost for recurring purchases", () => {
    const r = buildScenario(part(), "recurring", null);
    expect(r.noCost).toBe(false);
    expect(r.cost).toBe(2);
    expect(r.scenario).toMatch(/Replacement Cost/);
  });

  it("spot + qty: inventory >= 70% of qty uses average cost", () => {
    // total inv 100, qty 100 -> 100% -> average cost
    const r = buildScenario(part(), "spot", 100);
    expect(r.cost).toBe(1);
    expect(r.scenario).toMatch(/Average Cost/);
  });

  it("spot + qty: inventory < 70% of qty uses replacement cost", () => {
    // total inv 100, qty 200 -> 50% -> replacement cost
    const r = buildScenario(part(), "spot", 200);
    expect(r.cost).toBe(2);
    expect(r.scenario).toMatch(/Replacement Cost/);
  });

  it("spot + no qty: >=100 units uses average cost, <100 uses replacement", () => {
    expect(buildScenario(part({ inventory: { A: 150 } }), "spot", null).cost).toBe(1);
    expect(buildScenario(part({ inventory: { A: 50 } }), "spot", null).cost).toBe(2);
  });

  it("falls back to no-cost when the chosen cost field is missing", () => {
    // recurring needs replacement cost; none -> noCost
    expect(buildScenario(part({ repCost: 0 }), "recurring", null).noCost).toBe(true);
  });

  it("treats null cost fields (missing in CSV) as no-cost", () => {
    expect(buildScenario(part({ avgCost: null, repCost: null }), "spot", 10).noCost).toBe(true);
  });

  it("accepts string/comma quantities (real CSV data)", () => {
    // total inv 100, qty '1,000' -> 10% -> replacement cost (string with comma)
    const r = buildScenario(part(), "spot", "1,000");
    expect(r.cost).toBe(2);
    expect(r.scenario).toMatch(/Replacement Cost/);
    // ' 50 ' -> 100/50 = 200% -> average cost
    expect(buildScenario(part(), "spot", " 50 ").cost).toBe(1);
  });

  it("ignores non-numeric qty and falls back to no-qty logic", () => {
    // garbage qty -> null -> no-qty branch; total 100 >= 100 -> average cost
    expect(buildScenario(part(), "spot", "abc").cost).toBe(1);
  });
});
