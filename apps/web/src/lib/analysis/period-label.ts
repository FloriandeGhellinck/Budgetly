import type { DayRange } from "@budgetly/contract";
import { fromIsoDay, monthDays } from "../dates";

type Parts = { day?: "numeric"; month: "long" | "short"; year?: "numeric" };
type DateFormat = (date: Date, options: Parts) => string;

// "November 2026", "Sep – Nov 2026" or "3 Oct – 20 Nov 2026". Built from
// two single dates rather than Intl's range format, whose spacing differs
// between Node and browsers and would break hydration.
export function periodLabel({ from, to }: DayRange, format: DateFormat): string {
  const start = fromIsoDay(from);
  const end = fromIsoDay(to);
  const wholeMonths = from.endsWith("-01") && monthDays(to.slice(0, 7)).to === to;
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  if (wholeMonths && from.slice(0, 7) === to.slice(0, 7)) {
    return format(start, { month: "long", year: "numeric" });
  }
  const unit: Parts = wholeMonths ? { month: "short" } : { day: "numeric", month: "short" };
  const first = format(start, sameYear ? unit : { ...unit, year: "numeric" });
  return `${first} – ${format(end, { ...unit, year: "numeric" })}`;
}
