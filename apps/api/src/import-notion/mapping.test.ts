import { describe, expect, it } from "vitest";
import { mapExpense, planImport } from "./mapping.ts";
import type { ExpenseRow } from "./parse.ts";

const CHILDREN_SUB_CATEGORIES = new Set(["Invest Child A", "Invest Child B"]);

describe("mapExpense", () => {
  it.each([
    [
      "Dépenses générales → Me, Daily life",
      "Dépenses générales",
      "Bouffe",
      "daily_life",
      "Bouffe",
      "me",
    ],
    ["Loisirs → Leisure", "Loisirs", "Vacances", "leisure", "Vacances", "me"],
    ["Investissement → Investment", "Investissement", "Bourse", "investment", "Bourse", "me"],
    ["Dettes → Debt", "Dettes", "Remboursement emprunt", "debt", "Remboursement emprunt", "me"],
    [
      "a children's sub-category → Children",
      "Investissement",
      "Invest Child A",
      "investment",
      "Invest Child A",
      "children",
    ],
    ["Enfants / Jouets → Leisure", "Enfants", "Jouets", "leisure", "Jouets", "children"],
    ["Enfants / Soins → Daily life", "Enfants", "Soins", "daily_life", "Soins", "children"],
    ["no sub-category → À classer", "Loisirs", "", "daily_life", "À classer", "me"],
    ["no category at all → À classer", "", "", "daily_life", "À classer", "me"],
  ])("%s", (_, category, subCategory, group, name, beneficiary) => {
    expect(mapExpense(category, subCategory, CHILDREN_SUB_CATEGORIES)).toEqual({
      ok: true,
      group,
      category: name,
      beneficiary,
      unmapped: false,
    });
  });

  it("treats no sub-category as the children's by default", () => {
    expect(mapExpense("Investissement", "Invest Child A")).toMatchObject({ beneficiary: "me" });
  });

  it("files an unknown Enfants sub-category under Daily life and flags it", () => {
    expect(mapExpense("Enfants", "Poney")).toEqual({
      ok: true,
      group: "daily_life",
      category: "Poney",
      beneficiary: "children",
      unmapped: true,
    });
  });

  it("refuses an unknown Catégorie, including prototype keys", () => {
    expect(mapExpense("Voyages", "Train")).toEqual({ ok: false, reason: "unknown Catégorie" });
    expect(mapExpense("constructor", "x")).toEqual({ ok: false, reason: "unknown Catégorie" });
  });
});

describe("planImport", () => {
  const row = (overrides: Partial<ExpenseRow>): ExpenseRow => ({
    row: 1,
    idempotencyKey: "k1",
    name: "Bread",
    occurredOn: "2026-01-05",
    amountMinor: 210,
    category: "Dépenses générales",
    subCategory: "Bouffe",
    type: "",
    card: "",
    ...overrides,
  });

  const plan = planImport(
    {
      rows: [
        row({ type: "Trip", card: "Non" }),
        row({ row: 2, idempotencyKey: "k2", name: "", category: "Enfants", subCategory: "Poney" }),
        row({ row: 3, idempotencyKey: "k3", category: "Voyages" }),
      ],
      blankRows: 4,
      skipped: [],
    },
    {
      months: [
        {
          row: 1,
          month: "2026-01",
          income: [{ column: "Salaire", seedKey: "salary", amountMinor: 300_000 }],
          notionSpendingMinor: 420,
        },
      ],
      blankRows: 0,
      skipped: [],
    },
  );

  it("turns rows into expenses with tags, falling back to the sub-category for a missing name", () => {
    expect(plan.expenses.map((e) => [e.name, e.group, e.category, e.beneficiary, e.tags])).toEqual([
      ["Bread", "daily_life", "Bouffe", "me", ["Trip"]],
      ["Poney", "daily_life", "Poney", "children", []],
    ]);
  });

  it("reports unknown categories, unmapped sub-categories and Carte rows", () => {
    expect(plan.skipped).toEqual([{ source: "expenses", row: 3, reason: "unknown Catégorie" }]);
    expect([...plan.unmappedSubCategories]).toEqual([["Poney", 1]]);
    expect(plan.cardRows).toBe(1);
  });

  it("passes the children's sub-categories through to the mapping", () => {
    const rows = [row({ category: "Investissement", subCategory: "Invest Child B" })];
    const empty = { months: [], blankRows: 0, skipped: [] };
    const plan = planImport({ rows, blankRows: 0, skipped: [] }, empty, {
      childrenSubCategories: ["Invest Child B"],
    });
    expect(plan.expenses.map((e) => e.beneficiary)).toEqual(["children"]);
  });

  it("makes one income per month and column, dated the 1st, with a per-month key", () => {
    expect(plan.incomes).toEqual([
      {
        idempotencyKey: "notion:income:2026-01:salary",
        name: "Salaire",
        occurredOn: "2026-01-01",
        amountMinor: 300_000,
        category: "salary",
      },
    ]);
  });
});
