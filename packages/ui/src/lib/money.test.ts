import { describe, expect, it } from "vitest";

import { formatAmountInput, formatMoney, parseAmountMinor, type FormatMoneyOptions } from "./money";

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

describe("parseAmountMinor", () => {
  it.each<[string, string, number]>([
    ["whole euros", "20", 2000],
    ["dot decimals", "20.68", 2068],
    ["comma decimals", "20,68", 2068],
    ["one decimal is tenths", "20,5", 2050],
    ["leading zero", "0.05", 5],
    ["surrounding spaces and euro sign", " €12,30 ", 1230],
    ["French grouping with spaces", "1 234,56", 123456],
    ["French grouping with narrow no-break spaces", `1${NNBSP}234,56`, 123456],
    ["dot grouping, comma decimals", "1.234,56", 123456],
    ["comma grouping, dot decimals", "1,234.56", 123456],
    ["several groups without decimals", "1.234.567", 123456700],
    ["several groups", "1.234.567,89", 123456789],
    ["beyond float precision stays exact", "90071992547409.91", 9007199254740991],
  ])("reads %s", (_label, input, expected) => {
    expect(parseAmountMinor(input)).toBe(expected);
  });

  it.each([
    ["empty", ""],
    ["zero", "0,00"],
    ["negative", "-20"],
    ["three decimals", "20.685"],
    ["one thousands group without decimals (ambiguous)", "1,234"],
    ["letters", "20 euros"],
    ["two separators of the same kind", "1.234.56"],
    ["a bare separator", ","],
    ["scientific notation", "1e3"],
    ["beyond safe integer range", "90071992547409.92"],
  ])("rejects %s", (_label, input) => {
    expect(parseAmountMinor(input)).toBeNull();
  });
});

describe("formatAmountInput", () => {
  it.each<[string, number, string, string]>([
    ["French", 2068, "fr", "20,68"],
    ["English", 2068, "en", "20.68"],
    ["no grouping", 123456, "fr", "1234,56"],
    ["whole euros keep cents", 2000, "en", "20.00"],
  ])("%s", (_label, amountMinor, locale, expected) => {
    expect(formatAmountInput(amountMinor, locale)).toBe(expected);
  });

  it.each(["fr", "en"])("round-trips through parseAmountMinor in %s", (locale) => {
    expect(parseAmountMinor(formatAmountInput(123456, locale))).toBe(123456);
  });
});
