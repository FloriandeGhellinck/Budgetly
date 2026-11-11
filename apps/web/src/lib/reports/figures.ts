import type { MoneyDirection } from "@budgetly/ui/lib/money";

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

// A part's share of a total in basis points, rounded half up; 0 for no total.
export function shareBps(part: number, total: number): number {
  return total > 0 ? Math.round((part * 10000) / total) : 0;
}

// A rate in basis points as the filled part of a ring out of 100, clamped:
// a savings rate above 100 % fills it, never overflows.
export function ringShare(bps: number): number {
  return Math.min(100, Math.max(0, bps / 100));
}

export type DonutSegment<T> = { item: T; offset: number; length: number };

// Arcs of a donut whose circumference is 100 units, in order, each `gap`
// units shorter so neighbours are separated by the surface. Zero parts draw
// nothing; a lone part is a full ring.
export function donutSegments<T extends { totalMinor: number }>(
  items: readonly T[],
  gap = 0,
): DonutSegment<T>[] {
  const parts = items.filter((item) => item.totalMinor > 0);
  const total = parts.reduce((sum, item) => sum + item.totalMinor, 0);
  const spacing = parts.length > 1 ? gap : 0;
  let offset = 0;
  return parts.map((item) => {
    const share = (item.totalMinor * 100) / total;
    const segment = { item, offset, length: Math.max(share - spacing, 0.0001) };
    offset += share;
    return segment;
  });
}

// The first `max - 1` parts and the rest summed into one, so a chart keeps
// at most `max` parts; unchanged when it already fits.
export function foldTail<T extends { totalMinor: number }>(
  items: readonly T[],
  max: number,
  other: (rest: readonly T[]) => T,
): T[] {
  if (items.length <= max) return [...items];
  return [...items.slice(0, max - 1), other(items.slice(max - 1))];
}
