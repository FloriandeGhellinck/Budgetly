// What a plan would write, aggregated for --dry-run and for the end of a run.
import type { ImportPlan } from "./mapping.ts";

type Tally = { count: number; amountMinor: number };

export type PlanSummary = {
  expenses: Tally;
  incomes: Tally;
  byBeneficiary: Map<string, Tally>;
  // "Group / Category"
  byCategory: Map<string, Tally>;
  byTag: Map<string, Tally>;
  // YYYY-MM → imported expenses, income, and Notion's own DEPENSES.
  byMonth: Map<string, { expenses: Tally; income: Tally; notionSpendingMinor: number | null }>;
};

const empty = (): Tally => ({ count: 0, amountMinor: 0 });

function add(map: Map<string, Tally>, key: string, amountMinor: number) {
  const tally = map.get(key) ?? empty();
  tally.count += 1;
  tally.amountMinor += amountMinor;
  map.set(key, tally);
}

export function summarizePlan(plan: ImportPlan): PlanSummary {
  const summary: PlanSummary = {
    expenses: empty(),
    incomes: empty(),
    byBeneficiary: new Map(),
    byCategory: new Map(),
    byTag: new Map(),
    byMonth: new Map(),
  };
  const month = (key: string) => {
    let entry = summary.byMonth.get(key);
    if (!entry) {
      entry = {
        expenses: empty(),
        income: empty(),
        notionSpendingMinor: plan.notionSpending.get(key) ?? null,
      };
      summary.byMonth.set(key, entry);
    }
    return entry;
  };

  for (const expense of plan.expenses) {
    const { amountMinor } = expense;
    summary.expenses.count += 1;
    summary.expenses.amountMinor += amountMinor;
    add(summary.byBeneficiary, expense.beneficiary, amountMinor);
    add(summary.byCategory, `${expense.group} / ${expense.category}`, amountMinor);
    for (const tag of expense.tags) add(summary.byTag, tag, amountMinor);
    const tally = month(expense.occurredOn.slice(0, 7)).expenses;
    tally.count += 1;
    tally.amountMinor += amountMinor;
  }
  for (const income of plan.incomes) {
    summary.incomes.count += 1;
    summary.incomes.amountMinor += income.amountMinor;
    const tally = month(income.occurredOn.slice(0, 7)).income;
    tally.count += 1;
    tally.amountMinor += income.amountMinor;
  }
  summary.byMonth = new Map([...summary.byMonth].toSorted(([a], [b]) => a.localeCompare(b)));
  return summary;
}

// Cents as "1234.56" (display edge only).
function euros(minor: number): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

const line = (label: string, tally: Tally) =>
  `  ${label.padEnd(48)} ${String(tally.count).padStart(5)}  ${euros(tally.amountMinor).padStart(12)}`;

const sortedLines = (map: Map<string, Tally>) =>
  [...map].toSorted(([a], [b]) => a.localeCompare(b, "fr")).map(([key, t]) => line(key, t));

export function formatPlanSummary(plan: ImportPlan): string {
  const summary = summarizePlan(plan);
  const out: string[] = [];
  out.push(
    `Expenses: ${summary.expenses.count} transactions, ${euros(summary.expenses.amountMinor)} €`,
  );
  out.push(
    `Income:   ${summary.incomes.count} transactions, ${euros(summary.incomes.amountMinor)} €`,
  );
  out.push(
    `Blank rows dropped: ${plan.blankRows.expenses} (expenses), ${plan.blankRows.summary} (summary)`,
  );
  out.push(`Rows with Carte filled in (ignored): ${plan.cardRows}`);

  out.push("", "By beneficiary (count, €):", ...sortedLines(summary.byBeneficiary));
  out.push("", "By group / category (count, €):", ...sortedLines(summary.byCategory));
  out.push("", "By tag (count, €):", ...sortedLines(summary.byTag));

  out.push("", "By month: expenses (count, €) | income (count, €) | Notion DEPENSES €");
  for (const [key, entry] of summary.byMonth) {
    const notion = entry.notionSpendingMinor === null ? "-" : euros(entry.notionSpendingMinor);
    out.push(
      `  ${key}  ${String(entry.expenses.count).padStart(4)} ${euros(entry.expenses.amountMinor).padStart(11)} | ${String(entry.income.count).padStart(2)} ${euros(entry.income.amountMinor).padStart(10)} | ${notion.padStart(10)}`,
    );
  }

  out.push(
    "",
    `Unmapped Enfants sub-categories (filed under daily_life): ${plan.unmappedSubCategories.size}`,
  );
  for (const [name, count] of plan.unmappedSubCategories) out.push(`  ${name}: ${count}`);

  out.push("", `Skipped rows: ${plan.skipped.length}`);
  for (const skip of plan.skipped) out.push(`  ${skip.source} row ${skip.row}: ${skip.reason}`);
  return out.join("\n");
}
