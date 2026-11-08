// Notion columns → beneficiary, category group and category (ADR 0009, 0010,
// 0033). Pure: the plan names groups by seed key and categories by name; the
// runner resolves them to ids.
import type { CategoryGroupSeedKey } from "@expense/db";
import type { ExpenseRow, IncomeSeedKey, ParsedExpenses, ParsedSummary, Skipped } from "./parse.ts";

export type ExpenseGroupKey = Exclude<CategoryGroupSeedKey, "income">;
export type BeneficiaryRef = "me" | "children";

export const ACCOUNT_NAME = "Notion history";
export const CHILDREN_BENEFICIARY = "Children";
// Rows without a sub-category land here, in Daily life.
export const UNSORTED_CATEGORY = "À classer";

const CHILDREN = "Enfants";

// Notion `Catégorie` → group. `Enfants` is a beneficiary, not a group: its
// group comes from the sub-category (ENFANTS_GROUPS). Maps, not object
// literals, so a cell like "constructor" cannot hit a prototype key.
const CATEGORY_GROUPS = new Map<string, ExpenseGroupKey>([
  ["Dépenses générales", "daily_life"],
  ["Loisirs", "leisure"],
  ["Investissement", "investment"],
  ["Dettes", "debt"],
]);

// Group of each sub-category seen under `Enfants` in the export. Anything not
// listed goes to Daily life and is reported.
export const ENFANTS_GROUPS = new Map<string, ExpenseGroupKey>([
  ["Jouets", "leisure"],
  ["Activité / Sortie", "leisure"],
  ["Cadeaux", "leisure"],
  ["Soins", "daily_life"],
  ["Bouffe", "daily_life"],
  ["Creche", "daily_life"],
  ["Bbsit", "daily_life"],
  ["Vetements", "daily_life"],
  ["Mobilier", "daily_life"],
  ["Dépenses maison", "daily_life"],
  ["Dépenses maison (non durable)", "daily_life"],
  ["Abonnements", "daily_life"],
  ["Assurances / mutuelle", "daily_life"],
  ["Déplacement", "daily_life"],
  ["Internet - Téléphone", "daily_life"],
  ["Incapacité Travail", "daily_life"],
  ["Taxes", "daily_life"],
]);

export type ExpenseMapping =
  | {
      ok: true;
      group: ExpenseGroupKey;
      category: string;
      beneficiary: BeneficiaryRef;
      // An Enfants sub-category missing from ENFANTS_GROUPS.
      unmapped: boolean;
    }
  | { ok: false; reason: string };

// childrenSubCategories: sub-categories that make a non-Enfants row the
// children's (ADR 0010), passed with --children-sub-category.
export function mapExpense(
  category: string,
  subCategory: string,
  childrenSubCategories: ReadonlySet<string> = new Set(),
): ExpenseMapping {
  // "À classer" lives in Daily life, whatever the Catégorie.
  const unsorted = subCategory === "";
  const name = unsorted ? UNSORTED_CATEGORY : subCategory;
  if (category === CHILDREN) {
    const group = unsorted ? "daily_life" : ENFANTS_GROUPS.get(subCategory);
    return {
      ok: true,
      group: group ?? "daily_life",
      category: name,
      beneficiary: "children",
      unmapped: group === undefined,
    };
  }
  const group = category === "" ? "daily_life" : CATEGORY_GROUPS.get(category);
  if (!group) return { ok: false, reason: "unknown Catégorie" };
  return {
    ok: true,
    group: unsorted ? "daily_life" : group,
    category: name,
    beneficiary: childrenSubCategories.has(subCategory) ? "children" : "me",
    unmapped: false,
  };
}

export type PlannedExpense = {
  row: number;
  idempotencyKey: string;
  name: string;
  occurredOn: string;
  amountMinor: number;
  group: ExpenseGroupKey;
  category: string;
  beneficiary: BeneficiaryRef;
  tags: string[];
};

export type PlannedIncome = {
  idempotencyKey: string;
  name: string;
  occurredOn: string;
  amountMinor: number;
  category: IncomeSeedKey;
};

export type ImportPlan = {
  expenses: PlannedExpense[];
  incomes: PlannedIncome[];
  skipped: Skipped[];
  blankRows: { expenses: number; summary: number };
  // Enfants sub-categories filed under Daily life for lack of a mapping.
  unmappedSubCategories: Map<string, number>;
  // Rows whose `Carte` was filled in: not imported (cashback comes from the account).
  cardRows: number;
  // Notion's DEPENSES per month (YYYY-MM), to cross-check the imported totals.
  notionSpending: Map<string, number | null>;
};

// The transaction name: Notion's Nom, else the sub-category, within Name's 200.
function transactionName(row: ExpenseRow, category: string): string {
  return (row.name || row.subCategory || category).slice(0, 200);
}

export type PlanOptions = { childrenSubCategories?: readonly string[] };

export function planImport(
  expenses: ParsedExpenses,
  summary: ParsedSummary,
  options: PlanOptions = {},
): ImportPlan {
  const childrenSubCategories = new Set(options.childrenSubCategories);
  const skipped = [...expenses.skipped, ...summary.skipped];
  const unmappedSubCategories = new Map<string, number>();
  const planned: PlannedExpense[] = [];

  for (const row of expenses.rows) {
    const mapping = mapExpense(row.category, row.subCategory, childrenSubCategories);
    if (!mapping.ok) {
      skipped.push({ source: "expenses", row: row.row, reason: mapping.reason });
      continue;
    }
    if (mapping.unmapped) {
      unmappedSubCategories.set(
        row.subCategory,
        (unmappedSubCategories.get(row.subCategory) ?? 0) + 1,
      );
    }
    planned.push({
      row: row.row,
      idempotencyKey: row.idempotencyKey,
      name: transactionName(row, mapping.category),
      occurredOn: row.occurredOn,
      amountMinor: row.amountMinor,
      group: mapping.group,
      category: mapping.category,
      beneficiary: mapping.beneficiary,
      tags: row.type === "" ? [] : [row.type.slice(0, 100)],
    });
  }

  const incomes = summary.months.flatMap(({ month, income }) =>
    income.map(({ column, seedKey, amountMinor }): PlannedIncome => ({
      idempotencyKey: `notion:income:${month}:${seedKey}`,
      name: column,
      occurredOn: `${month}-01`,
      amountMinor,
      category: seedKey,
    })),
  );

  return {
    expenses: planned,
    incomes,
    skipped,
    blankRows: { expenses: expenses.blankRows, summary: summary.blankRows },
    unmappedSubCategories,
    cardRows: expenses.rows.filter((row) => row.card !== "").length,
    notionSpending: new Map(summary.months.map((m) => [m.month, m.notionSpendingMinor])),
  };
}
