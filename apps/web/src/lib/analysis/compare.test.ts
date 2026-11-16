import { describe, expect, it } from "vitest";
import { comparisonChange } from "./compare";

describe("comparisonChange", () => {
  it.each([
    {
      label: "more spending is bad",
      total: 1120,
      prev: 1000,
      types: ["spending"],
      bps: 1200,
      tone: "bad",
    },
    {
      label: "less spending is good",
      total: 900,
      prev: 1000,
      types: ["spending", "saving"],
      bps: -1000,
      tone: "good",
    },
    {
      label: "more income is good",
      total: 1100,
      prev: 1000,
      types: ["income"],
      bps: 1000,
      tone: "good",
    },
    {
      label: "less saving is bad",
      total: 500,
      prev: 1000,
      types: ["saving"],
      bps: -5000,
      tone: "bad",
    },
    {
      label: "no change is neutral",
      total: 1000,
      prev: 1000,
      types: ["spending"],
      bps: 0,
      tone: "neutral",
    },
  ] as const)("$label", ({ total, prev, types, bps, tone }) => {
    expect(comparisonChange(total, prev, types)).toEqual({ bps, tone });
  });

  it("has nothing to say without a previous total", () => {
    expect(comparisonChange(500, 0, ["spending"])).toBeNull();
  });
});
