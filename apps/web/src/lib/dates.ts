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
