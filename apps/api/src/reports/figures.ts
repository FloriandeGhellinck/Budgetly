import type { MonthFigures } from "@budgetly/contract";

export type MonthTotals = { incomeMinor: number; spendingMinor: number; savingMinor: number };

// saving / income in basis points, rounded half up; null without income (ADR 0004).
export function savingsRateBps(savingMinor: number, incomeMinor: number): number | null {
  if (incomeMinor <= 0) return null;
  return Math.floor((savingMinor * 10_000 + Math.floor(incomeMinor / 2)) / incomeMinor);
}

export function monthFigures(month: string, totals: MonthTotals): MonthFigures {
  return {
    month,
    ...totals,
    netMinor: totals.incomeMinor - totals.spendingMinor - totals.savingMinor,
    savingsRateBps: savingsRateBps(totals.savingMinor, totals.incomeMinor),
  };
}

export function figuresChange(current: MonthFigures, previous: MonthFigures) {
  return {
    incomeMinor: current.incomeMinor - previous.incomeMinor,
    spendingMinor: current.spendingMinor - previous.spendingMinor,
    savingMinor: current.savingMinor - previous.savingMinor,
    netMinor: current.netMinor - previous.netMinor,
    savingsRateBps:
      current.savingsRateBps === null || previous.savingsRateBps === null
        ? null
        : current.savingsRateBps - previous.savingsRateBps,
  };
}

// The YYYY-MM before `month`.
export function previousMonth(month: string): string {
  const [year = 0, mon = 1] = month.split("-").map(Number);
  return mon === 1 ? `${year - 1}-12` : `${year}-${String(mon - 1).padStart(2, "0")}`;
}
