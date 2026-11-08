import { describe, expect, it } from "vitest";

import { formatMoney, type FormatMoneyOptions } from "./money";

// Intl output uses U+00A0 (no-break space) and, in French, U+202F (narrow no-break space).
const NBSP = String.fromCodePoint(0x00a0);
const NNBSP = String.fromCodePoint(0x202f);

describe("formatMoney", () => {
  it.each<[string, number, FormatMoneyOptions, string]>([
    ["unsigned fr-BE", 2068, { locale: "fr-BE" }, `20,68${NBSP}€`],
    ["unsigned en", 2068, { locale: "en" }, "€20.68"],
    ["thousands fr-BE", 123456705, { locale: "fr-BE" }, `1${NNBSP}234${NNBSP}567,05${NBSP}€`],
    ["thousands en", 123456705, { locale: "en" }, "€1,234,567.05"],
    ["sub-euro keeps leading zero", 5, { locale: "en" }, "€0.05"],
    ["expense is negative", 2068, { locale: "fr-BE", direction: "expense" }, `-20,68${NBSP}€`],
    ["income is positive", 2068, { locale: "en", direction: "income" }, "+€20.68"],
    ["transfer out is negative", 100, { locale: "en", direction: "transfer_out" }, "-€1.00"],
    ["transfer in is positive", 100, { locale: "en", direction: "transfer_in" }, "+€1.00"],
    ["zero has no sign", 0, { locale: "en", direction: "expense" }, "€0.00"],
    [
      "beyond float precision stays exact",
      9007199254740991,
      { locale: "en" },
      "€90,071,992,547,409.91",
    ],
  ])("%s", (_label, amountMinor, options, expected) => {
    expect(formatMoney(amountMinor, options)).toBe(expected);
  });

  it.each([
    ["negative", -1],
    ["fractional", 12.5],
    ["unsafe integer", 2 ** 53],
  ])("rejects a %s amountMinor", (_label, amountMinor) => {
    expect(() => formatMoney(amountMinor, { locale: "en" })).toThrow(RangeError);
  });
});
