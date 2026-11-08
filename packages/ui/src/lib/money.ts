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

// Spaces, apostrophes and the euro sign a user may type or paste around an amount.
const NOISE = /[\s  '’€]/g;
const PLAIN = /^(\d+)(?:[.,](\d{1,2}))?$/;
// Grouped thousands ("1.234,56", "1,234.56", "1.234.567"): the decimal separator, if any, is the other one.
const GROUPED = /^(\d{1,3}(?:([.,])\d{3})+)(?:([.,])(\d{1,2}))?$/;

// "20.685" or "1,234": a typo with three decimals, or one thousands group? Refused.
function isAmbiguous(grouped: RegExpExecArray): boolean {
  const separator = grouped[2] ?? "";
  return grouped[3] === undefined && (grouped[1] ?? "").split(separator).length === 2;
}

/**
 * Parses an amount typed in the UI ("20,68", "20.68", "1 234,5", "€12") into
 * positive integer cents, the only form money takes past the input (ADR 0006).
 * Returns null for anything else: empty, zero, negative, more than two
 * decimals, or beyond safe integer range. The sign comes from the direction.
 */
export function parseAmountMinor(input: string): number | null {
  const text = input.replace(NOISE, "");
  let euros: string;
  let cents: string;
  const plain = PLAIN.exec(text);
  const grouped = plain ? null : GROUPED.exec(text);
  if (plain) {
    euros = plain[1] ?? "";
    cents = plain[2] ?? "";
  } else if (grouped && grouped[2] !== grouped[3] && !isAmbiguous(grouped)) {
    euros = (grouped[1] ?? "").replaceAll(grouped[2] ?? "", "");
    cents = grouped[4] ?? "";
  } else {
    return null;
  }
  // Integer arithmetic on the digits: the amount never passes through a float.
  const amountMinor = Number(euros) * 100 + Number(cents.padEnd(2, "0"));
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return null;
  return amountMinor;
}

/**
 * The editable form of an amount: "20,68" in French, "20.68" in English, no
 * grouping, so `parseAmountMinor` reads it back unchanged.
 */
export function formatAmountInput(amountMinor: number, locale: string): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new RangeError(`amountMinor must be a non-negative integer, got ${amountMinor}`);
  }
  const separator =
    new Intl.NumberFormat(locale).formatToParts(1.5).find((part) => part.type === "decimal")
      ?.value ?? ".";
  const cents = amountMinor % 100;
  return `${(amountMinor - cents) / 100}${separator}${String(cents).padStart(2, "0")}`;
}
