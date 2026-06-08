// Pure pricing logic. This is the product — preserved exactly from the original
// tool. See CLAUDE.md §6 for the business rules. Unit-tested in pricing.test.js.

import { parseQty } from "./format.js";

export function totalInv(inventory) {
  if (!inventory) return 0;
  return Object.values(inventory).reduce((a, b) => a + (Number(b) || 0), 0);
}

// Sell price from cost and margin. Valid only for 0 < margin < 1.
export function calcSell(cost, margin) {
  return margin > 0 && margin < 1 ? cost / (1 - margin) : null;
}

// Decide which cost a part should use for a given purchase scenario.
// Returns { cost, noCost, scenario, total }.
export function buildScenario(part, purchaseType, qty, floorless) {
  const total = totalInv(part.inventory);
  const hasAvg = part.avgCost > 0;
  const hasRep = part.repCost > 0;

  if (!hasAvg && !hasRep) {
    return { cost: 0, noCost: true, scenario: "No cost available in system", total };
  }

  if (purchaseType === "recurring") {
    if (!hasRep) return { cost: 0, noCost: true, scenario: "Recurring - No Replacement Cost on record", total };
    return { cost: part.repCost, noCost: false, scenario: "Recurring -> Replacement Cost", total };
  }

  const qtyNum = parseQty(qty); // tolerates "1,000", " 500 ", NaN -> null
  if (qtyNum && qtyNum > 0) {
    const pct = total / qtyNum;
    if (pct >= 0.7) {
      if (!hasAvg) return { cost: 0, noCost: true, scenario: `Spot Buy - Inv ${(pct * 100).toFixed(0)}% of qty - No Average Cost`, total };
      return { cost: part.avgCost, noCost: false, scenario: `Spot Buy -> Inv ${(pct * 100).toFixed(0)}% of qty (70%+) -> Average Cost`, total };
    }
    if (!hasRep) return { cost: 0, noCost: true, scenario: `Spot Buy - Inv ${(pct * 100).toFixed(0)}% of qty - No Replacement Cost`, total };
    return { cost: part.repCost, noCost: false, scenario: `Spot Buy -> Inv ${(pct * 100).toFixed(0)}% of qty (<70%) -> Replacement Cost`, total };
  }

  if (total >= 100) {
    if (!hasAvg) return { cost: 0, noCost: true, scenario: `Spot Buy - ${total} units on hand - No Average Cost`, total };
    return { cost: part.avgCost, noCost: false, scenario: `Spot Buy -> No Qty -> ${total} units (100+ units) -> Average Cost`, total };
  }
  if (!hasRep) return { cost: 0, noCost: true, scenario: `Spot Buy - ${total} units on hand - No Replacement Cost`, total };
  return { cost: part.repCost, noCost: false, scenario: `Spot Buy -> No Qty -> ${total} units (<100) -> Replacement Cost`, total };
}
