import { monthIndex } from "@budgetly/contract";

// A calendar day as `YYYY-MM-DD` in the user's local time zone; the API's day
// format (ADR 0027). toISOString() would give the UTC day instead.
export function toIsoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// Local midnight of a `YYYY-MM-DD` day, for date pickers.
export function fromIsoDay(day: string): Date {
  const [year = 1970, month = 1, date = 1] = day.split("-").map(Number);
  return new Date(year, month - 1, date);
}

// The UI's time zone for now (ADR 0031); "today" and "this month" are read here.
export const TIME_ZONE = "Europe/Brussels";

// The `YYYY-MM` month an instant falls in, in `timeZone`. The server runs in
// UTC, so "this month" must not come from the server's clock alone.
export function monthOf(instant: Date, timeZone: string = TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit" })
    .formatToParts(instant)
    .reduce<Record<string, string>>((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  return `${parts["year"]}-${parts["month"]}`;
}

// The month `delta` months after `month` (negative: before).
export function shiftMonth(month: string, delta: number): string {
  const index = monthIndex(month) + delta;
  const year = Math.floor(index / 12);
  return `${year}-${String(index - year * 12 + 1).padStart(2, "0")}`;
}

// First and last day of a month, inclusive, as the API's `from`/`to`.
export function monthDays(month: string): { from: string; to: string } {
  const [year = 1970, mon = 1] = month.split("-").map(Number);
  // Day 0 of the next month is the last day of this one.
  const last = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

// Local midnight on the first of a month, for formatting its name.
export function monthStart(month: string): Date {
  return fromIsoDay(`${month}-01`);
}
