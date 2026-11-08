// Amounts are positive integer cents of EUR (ADR 0006); the sign comes from the direction.
export type MoneyDirection = "expense" | "income" | "transfer_out" | "transfer_in";

export type FormatMoneyOptions = {
  /** BCP 47 locale, e.g. `fr-BE` or `en`. */
  locale: string;
  /** When set, the amount is signed: money out is negative, money in positive. */
  direction?: MoneyDirection;
};

const OUTGOING: ReadonlySet<MoneyDirection> = new Set(["expense", "transfer_out"]);

export function formatMoney(
  amountMinor: number,
  { locale, direction }: FormatMoneyOptions,
): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new RangeError(`amountMinor must be a non-negative integer, got ${amountMinor}`);
  }
  const sign = direction !== undefined && OUTGOING.has(direction) ? "-" : "";
  const cents = amountMinor % 100;
  const euros = (amountMinor - cents) / 100;
  // A decimal string keeps the value exact: Intl never sees a float.
  const decimal = `${sign}${euros}.${String(cents).padStart(2, "0")}` as `${number}`;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    signDisplay: direction === undefined ? "auto" : "exceptZero",
  }).format(decimal);
}
