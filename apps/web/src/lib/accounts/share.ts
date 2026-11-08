import { formatAmountInput } from "@expense/ui/lib/money";
import { formatRate } from "../reports/figures";

// An account's share is stored and sent as basis points (ADR 0026, 0027); the
// UI shows and takes a percentage with at most two decimals.

const PERCENT = /^(\d{1,3})(?:[.,](\d{1,2}))?$/;

// "50" → 5000, "33,33" → 3333, "12.5 %" → 1250. Null outside 0.01–100 % or
// with more than two decimals. Integer arithmetic on the digits.
export function percentToBps(input: string): number | null {
  const match = PERCENT.exec(input.replace(/[\s %]/g, ""));
  if (!match) return null;
  const bps = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return bps >= 1 && bps <= 10_000 ? bps : null;
}

// The editable form of a share: 5000 → "50", 3333 → "33,33" in French. Same
// digits as cents, so the money input's formatter gives the separator.
export function bpsToPercentInput(bps: number, locale: string): string {
  return formatAmountInput(bps, locale)
    .replace(/([.,]\d*?)0+$/, "$1")
    .replace(/[.,]$/, "");
}

// A share for display: "50%", "33.33%".
export function formatShare(bps: number, locale: string): string {
  return formatRate(bps, locale, 2);
}
