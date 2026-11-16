import { AnalysisView } from "@budgetly/contract";
import { describe, expect, it } from "vitest";
import {
  analysisHref,
  analysisInput,
  drillDown,
  drillUp,
  parseAnalysisView,
  transactionFilters,
  withGroups,
  withTypes,
} from "./view";

const G1 = "9c8b7a6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const G2 = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const C1 = "5b1e2d3c-4f5a-4b6c-9d7e-8f9a0b1c2d3e";
const C2 = "2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a";
const T1 = "6e7f8a9b-0c1d-4e2f-8a3b-4c5d6e7f8a9b";
const base = AnalysisView.parse({});
const groupTypes = new Map([
  [G1, "spending" as const],
  [G2, "income" as const],
]);
const categoryGroups = new Map([
  [C1, G1],
  [C2, G2],
]);

describe("parseAnalysisView", () => {
  it("gives the default view for an empty URL", () => {
    expect(parseAnalysisView({})).toEqual(base);
  });

  it("drops bad values instead of failing", () => {
    expect(
      parseAnalysisView({
        period: "someday",
        types: "income,nope",
        groups: `${G1},not-an-id,${G1}`,
        groupBy: "weather",
      }),
    ).toEqual({ ...base, types: ["income"], groupIds: [G1] });
  });

  it("reads fixed days, swapped when reversed", () => {
    expect(parseAnalysisView({ from: "2026-11-20", to: "2026-10-03" }).period).toEqual({
      kind: "fixed",
      from: "2026-10-03",
      to: "2026-11-20",
    });
  });

  it.each(["month", "tag"])("shows bars when grouping by %s", (groupBy) => {
    expect(parseAnalysisView({ groupBy, display: "donut" }).display).toBe("bars");
  });

  it("round-trips through analysisHref", () => {
    const view: AnalysisView = {
      ...base,
      period: { kind: "fixed", from: "2026-01-01", to: "2026-03-15" },
      types: ["income", "saving"],
      groupIds: [G1],
      categoryIds: [C1, C2],
      tagIds: [T1],
      text: "café",
      groupBy: "category",
      display: "bars",
      compare: "last-year",
    };
    const query = new URL(analysisHref(view), "http://x").searchParams;

    expect(parseAnalysisView(Object.fromEntries(query))).toEqual(view);
  });

  it("leaves defaults out of the URL", () => {
    expect(analysisHref(base)).toBe("/analysis");
  });
});

describe("withTypes / withGroups", () => {
  it("drops groups and categories of types no longer selected", () => {
    const view = { ...base, groupIds: [G1, G2], categoryIds: [C1, C2] };

    expect(withTypes(view, ["income"], groupTypes, categoryGroups)).toMatchObject({
      types: ["income"],
      groupIds: [G2],
      categoryIds: [C2],
    });
  });

  it("drops categories outside the chosen groups", () => {
    const view = { ...base, categoryIds: [C1, C2] };

    expect(withGroups(view, [G1], categoryGroups).categoryIds).toEqual([C1]);
  });
});

describe("drill-down", () => {
  it("filters to one group by category, and back", () => {
    const down = drillDown({ ...base, categoryIds: [C2] }, G1);

    expect(down).toMatchObject({ groupIds: [G1], categoryIds: [], groupBy: "category" });
    expect(drillUp(down)).toMatchObject({ groupIds: [], groupBy: "group" });
  });
});

describe("analysisInput", () => {
  it("resolves the period and the comparison range", () => {
    const input = analysisInput({ ...base, compare: "last-year" }, "2026-11-16");

    expect(input).toMatchObject({
      from: "2026-11-01",
      to: "2026-11-30",
      compare: { from: "2025-11-01", to: "2025-11-30" },
      groupBy: "group",
      types: ["spending", "saving"],
    });
  });
});

describe("transactionFilters", () => {
  const range = { from: "2026-10-10", to: "2026-12-31" };
  const tagName = (id: string) => (id === T1 ? "Trip" : undefined);

  it.each([
    {
      label: "a category, spending + saving as expenses",
      view: base,
      item: { groupBy: "category" as const, key: C1 },
      expected: { ...range, direction: "expense", categoryId: C1 },
    },
    {
      label: "a month, clipped to the period, with the single filters",
      view: {
        ...base,
        types: ["income" as const],
        groupIds: [G2],
        tagIds: [T1],
        text: "bonus",
      },
      item: { groupBy: "month" as const, key: "2026-10" },
      expected: {
        from: "2026-10-10",
        to: "2026-10-31",
        direction: "income",
        groupId: G2,
        tag: "Trip",
        text: "bonus",
      },
    },
    {
      label: "mixed types: no direction; several groups carried",
      view: { ...base, types: ["income" as const, "spending" as const], groupIds: [G1, G2] },
      item: { groupBy: "beneficiary" as const, key: T1 },
      expected: { ...range, beneficiaryId: T1, groupIds: [G1, G2] },
    },
    {
      label: "several categories on a month",
      view: { ...base, groupIds: [G1], categoryIds: [C1, C2] },
      item: { groupBy: "month" as const, key: "2026-11" },
      expected: {
        from: "2026-11-01",
        to: "2026-11-30",
        direction: "expense",
        categoryIds: [C1, C2],
      },
    },
  ])("$label", ({ view, item, expected }) => {
    expect(transactionFilters(view, range, item, tagName)).toEqual(expected);
  });
});
