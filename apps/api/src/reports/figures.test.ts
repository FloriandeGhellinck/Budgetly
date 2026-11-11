import { describe, expect, it } from "vitest";
import { figuresChange, monthFigures, previousMonth, savingsRateBps } from "./figures.ts";

describe("savingsRateBps", () => {
  it.each([
    { label: "a quarter", saving: 50000, income: 200000, expected: 2500 },
    { label: "rounds half up", saving: 1, income: 20000, expected: 1 },
    { label: "rounds down below half", saving: 1, income: 30000, expected: 0 },
    { label: "more saved than earned", saving: 30000, income: 20000, expected: 15000 },
    { label: "no income", saving: 5000, income: 0, expected: null },
  ])("$label", ({ saving, income, expected }) => {
    expect(savingsRateBps(saving, income)).toBe(expected);
  });
});

describe("monthFigures", () => {
  it("nets income against spending and saving, negative when overspent", () => {
    const figures = monthFigures("2026-11", {
      incomeMinor: 100000,
      spendingMinor: 90000,
      savingMinor: 20000,
    });

    expect(figures).toEqual({
      month: "2026-11",
      incomeMinor: 100000,
      spendingMinor: 90000,
      savingMinor: 20000,
      netMinor: -10000,
      savingsRateBps: 2000,
    });
  });
});

describe("figuresChange", () => {
  it("has no savings rate change when one month has no income", () => {
    const current = monthFigures("2026-11", {
      incomeMinor: 100000,
      spendingMinor: 0,
      savingMinor: 0,
    });
    const previous = monthFigures("2026-10", {
      incomeMinor: 0,
      spendingMinor: 5000,
      savingMinor: 0,
    });

    expect(figuresChange(current, previous)).toEqual({
      incomeMinor: 100000,
      spendingMinor: -5000,
      savingMinor: 0,
      netMinor: 105000,
      savingsRateBps: null,
    });
  });
});

describe("previousMonth", () => {
  it.each([
    { month: "2026-11", expected: "2026-10" },
    { month: "2026-01", expected: "2025-12" },
  ])("$month → $expected", ({ month, expected }) => {
    expect(previousMonth(month)).toBe(expected);
  });
});
