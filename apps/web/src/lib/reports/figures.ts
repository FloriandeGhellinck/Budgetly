import type { MoneyDirection } from "@expense/ui/lib/money";

// Display helpers for report figures (ADR 0029). Inputs are integers: signed
// cents and basis points. Values reach Intl as exact decimal strings, never
// as floats.

// A signed cents value as the unsigned amount and direction <Money> takes.
export function signedMoney(minor: number): { amountMinor: number; direction: MoneyDirection } {
  return { amountMinor: Math.abs(minor), direction: minor < 0 ? "expense" : "income" };
}

// An integer as an exact decimal string with `scale` digits after the point:
// (2550, 4) → "0.2550", (-250, 2) → "-2.50".
function decimal(value: number, scale: number): `${number}` {
  const sign = value < 0 ? "-" : "";
  const digits = String(Math.abs(value)).padStart(scale + 1, "0");
  return `${sign}${digits.slice(0, -scale)}.${digits.slice(-scale)}` as `${number}`;
}

// A rate in basis points as a percentage: 2550 → "25.5%" ("25,5 %" in French).
export function formatRate(bps: number, locale: string, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits }).format(
    decimal(bps, 4),
  );
}

// A change between two rates in percentage points, signed: 250 → "+2.5".
export function formatPoints(bps: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  }).format(decimal(bps, 2));
}

export type Figure = "income" | "spending" | "saving" | "net" | "savingsRate";
export type Tone = "good" | "bad" | "neutral";

// Whether a month-on-month change is good news: more spending is bad, more of
// anything else is good.
export function changeTone(figure: Figure, change: number | null): Tone {
  if (change === null || change === 0) return "neutral";
  const up = change > 0;
  return up === (figure !== "spending") ? "good" : "bad";
}

// Each part's length relative to the largest (or to `scale` when larger), in
// percent, for ranked bars.
export function barWidths(totals: readonly number[], scale = 0): number[] {
  const max = Math.max(scale, ...totals);
  return totals.map((total) => (max > 0 ? (Math.max(total, 0) * 100) / max : 0));
}
