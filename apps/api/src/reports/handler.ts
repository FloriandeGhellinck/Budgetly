import { asCategoryColor, asCategoryIcon } from "@budgetly/contract";
import { authed } from "../orpc.ts";
import { figuresChange, monthFigures, previousMonth } from "./figures.ts";
import {
  accountBalances,
  breakdownTotals,
  findTag,
  monthlyTotals,
  tagTotals,
  transferFlows,
  type CategoryTotal,
} from "./repo.ts";

// Largest first; ties by name, uncategorized last, so the order is stable.
function byTotal<T extends { totalMinor: number }>(name: (row: T) => string | null) {
  return (a: T, b: T) => {
    const [nameA, nameB] = [name(a), name(b)];
    if (b.totalMinor !== a.totalMinor) return b.totalMinor - a.totalMinor;
    if (nameA === null || nameB === null) return Number(nameA === null) - Number(nameB === null);
    return nameA.localeCompare(nameB);
  };
}

const sum = (rows: readonly { totalMinor: number }[]) =>
  rows.reduce((total, row) => total + row.totalMinor, 0);
const countOf = (rows: readonly { count: number }[]) =>
  rows.reduce((total, row) => total + row.count, 0);

export const monthOverview = authed.reports.monthOverview.handler(async ({ input, context }) => {
  const [previous, current] = await monthlyTotals(
    context.tx,
    context.userId,
    previousMonth(input.month),
    input.month,
  );
  if (!previous || !current) throw new Error("reports.monthOverview: missing month rows");
  const currentFigures = monthFigures(current.month, current);
  const previousFigures = monthFigures(previous.month, previous);
  return {
    current: currentFigures,
    previous: previousFigures,
    change: figuresChange(currentFigures, previousFigures),
  };
});

export const trend = authed.reports.trend.handler(async ({ input, context }) => {
  const months = await monthlyTotals(context.tx, context.userId, input.from, input.to);
  return { months: months.map((totals) => monthFigures(totals.month, totals)) };
});

export const breakdown = authed.reports.breakdown.handler(async ({ input, context }) => {
  const rows = await breakdownTotals(context.tx, context.userId, input);
  const groups = new Map<string | null, CategoryTotal[]>();
  for (const row of rows) groups.set(row.groupId, [...(groups.get(row.groupId) ?? []), row]);
  const uncategorizedKind = input.direction === "expense" ? "spending" : null;
  return {
    totalMinor: sum(rows),
    count: countOf(rows),
    groups: [...groups.entries()]
      .map(([groupId, categories]) => ({
        groupId,
        name: categories[0]?.groupName ?? null,
        kind: groupId === null ? uncategorizedKind : (categories[0]?.groupKind ?? null),
        color: asCategoryColor(categories[0]?.groupColor ?? null),
        icon: asCategoryIcon(categories[0]?.groupIcon ?? null),
        totalMinor: sum(categories),
        count: countOf(categories),
        categories: categories
          .map((c) => ({
            categoryId: c.categoryId,
            name: c.categoryName,
            color: asCategoryColor(c.categoryColor),
            icon: asCategoryIcon(c.categoryIcon),
            totalMinor: c.totalMinor,
            count: c.count,
          }))
          .sort(byTotal((c) => c.name)),
      }))
      .sort(byTotal((g) => g.name)),
  };
});

export const tag = authed.reports.tag.handler(async ({ input, context, errors }) => {
  const found = await findTag(context.tx, context.userId, input);
  if (!found) {
    throw errors.NOT_FOUND({
      message: "No tag with this id or name for the caller. Find valid tags with tags.list.",
      data: { entity: "tag" },
    });
  }
  const rows = await tagTotals(context.tx, context.userId, found.id);
  const days = rows.flatMap((row) => [row.firstOn, row.lastOn]).sort();
  return {
    tag: found,
    expenseMinor: sum(rows.filter((row) => row.direction === "expense")),
    incomeMinor: sum(rows.filter((row) => row.direction === "income")),
    count: countOf(rows),
    firstOn: days[0] ?? null,
    lastOn: days.at(-1) ?? null,
    categories: rows
      .map((row) => ({
        direction: row.direction,
        groupId: row.groupId,
        groupName: row.groupName,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        totalMinor: row.totalMinor,
        count: row.count,
      }))
      .sort(byTotal((c) => c.categoryName)),
  };
});

export const accounts = authed.reports.accounts.handler(async ({ input, context }) => {
  const balances = await accountBalances(context.tx, context.userId, input.asOf);
  const flows = await transferFlows(context.tx, context.userId, {
    from: input.flowsFrom,
    to: input.flowsTo ?? input.asOf,
  });
  return { asOf: input.asOf ?? null, accounts: balances, flows };
});

export const reportsRouter = { monthOverview, trend, breakdown, tag, accounts };
