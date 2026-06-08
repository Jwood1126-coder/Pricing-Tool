import { describe, it, expect } from "vitest";
import { bomStripped } from "./parser.js";

// Regression test for the worker crash: a UTF-8 BOM from Excel must be removed
// at the byte level (NOT via a transformHeader function, which can't be cloned
// into the PapaParse worker via postMessage).
describe("bomStripped (Excel UTF-8 BOM handling)", () => {
  it("removes a leading UTF-8 BOM from the file bytes", async () => {
    const withBom = new Blob(["﻿PartNumber,AvgCost\nA-1,1.00"]);
    const out = await bomStripped(withBom);
    const text = await out.text();
    expect(text.charCodeAt(0)).not.toBe(0xfeff);
    expect(text.startsWith("PartNumber")).toBe(true);
  });

  it("leaves a file without a BOM unchanged", async () => {
    const noBom = new Blob(["PartNumber,AvgCost\nA-1,1.00"]);
    const out = await bomStripped(noBom);
    expect(await out.text()).toBe("PartNumber,AvgCost\nA-1,1.00");
  });
});
