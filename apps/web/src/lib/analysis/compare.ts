import type { AnalysisType } from "@budgetly/contract";
import type { Tone } from "../reports/figures";

export type Change = { bps: number; tone: Tone } | null;

// The change from the compare range to the period, in basis points (rounded
// half up), and whether it is good news: more spending is bad, more income
// or saving is good; a mix that includes spending reads like spending; a
// change that rounds to 0 % is neutral. Null when the compare range has
// nothing to compare with.
export function comparisonChange(
  totalMinor: number,
  previousMinor: number,
  types: readonly AnalysisType[],
): Change {
  if (previousMinor <= 0) return null;
  const bps = Math.round(((totalMinor - previousMinor) * 10000) / previousMinor);
  if (Math.abs(bps) < 50) return { bps, tone: "neutral" };
  const upIsBad = types.includes("spending");
  return { bps, tone: bps > 0 === upIsBad ? "bad" : "good" };
}
