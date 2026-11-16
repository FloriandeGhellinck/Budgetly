import { AnalysisView } from "@budgetly/contract";
import { describe, expect, it } from "vitest";
import { type AnalysisRow, analysisItems, type ItemContext } from "./items";

const G1 = "9c8b7a6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const C1 = "5b1e2d3c-4f5a-4b6c-9d7e-8f9a0b1c2d3e";
const C2 = "2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a";
const B1 = "6e7f8a9b-0c1d-4e2f-8a3b-4c5d6e7f8a9b";
const base = AnalysisView.parse({});

const row = (key: string | null, extra: Partial<AnalysisRow> = {}): AnalysisRow => ({
  key,
  name: key,
  color: null,
  groupId: null,
  totalMinor: 100,
  count: 1,
  ...extra,
});

const context = (view: AnalysisView): ItemContext => ({
  view,
  range: { from: "2026-11-01", to: "2026-11-30" },
  thisMonth: "2026-11",
  label: (r) => `label ${r.key}`,
  noneLabel: "Uncategorized",
  month: (key) => ({ label: `month ${key}`, short: key }),
  inProgress: "in progress",
  groupLabel: () => "Daily life",
  order: (id) => (id === B1 ? 1 : 0),
  tagName: () => undefined,
});

describe("analysisItems", () => {
  it("drills a group down to its categories", () => {
    const [item] = analysisItems([row(G1, { color: "teal" })], context(base));

    expect(item).toMatchObject({
      action: "drill",
      color: "teal",
      drillTo: { groupIds: [G1], groupBy: "category" },
    });
    expect(item?.href).toBe(`/analysis?groups=${G1}&groupBy=category`);
  });

  it("opens a category's transactions, named with its group across groups", () => {
    const view = { ...base, groupBy: "category" as const };
    const [item] = analysisItems([row(C1, { color: "teal", groupId: G1 })], context(view));

    expect(item).toMatchObject({ action: "transactions", detail: "Daily life" });
    expect(item?.href).toBe(
      `/transactions?categoryId=${C1}&direction=expense&from=2026-11-01&to=2026-11-30`,
    );
  });

  it("gives the bucket without an id the neutral look and no link", () => {
    const [item] = analysisItems([row(null)], context(base));

    expect(item).toEqual({
      key: "none",
      label: "Uncategorized",
      color: "none",
      totalMinor: 100,
      count: 1,
    });
  });

  it("marks the month in progress", () => {
    const view = { ...base, groupBy: "month" as const, display: "bars" as const };
    const items = analysisItems([row("2026-10"), row("2026-11")], context(view));

    expect(items.map((item) => item.badge)).toEqual([undefined, "in progress"]);
  });

  it("colours categories sharing their group's colour apart", () => {
    const view = { ...base, groupBy: "category" as const };
    const items = analysisItems(
      [row(C1, { color: "teal" }), row(C2, { color: "teal" })],
      context(view),
    );

    expect(items.map((item) => item.color)).toEqual(["teal", "green"]);
  });

  it("colours a beneficiary by its place in the user's list", () => {
    const view = { ...base, groupBy: "beneficiary" as const };
    const [item] = analysisItems([row(B1)], context(view));

    expect(item?.color).toBe("teal");
  });
});
