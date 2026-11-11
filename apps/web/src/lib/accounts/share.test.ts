import { describe, expect, it } from "vitest";
import { bpsToPercentInput, percentToBps } from "./share";

describe("percentToBps", () => {
  it.each([
    ["a whole percentage", "50", 5000],
    ["a decimal comma", "33,33", 3333],
    ["a decimal point and a percent sign", "12.5 %", 1250],
    ["the full share", "100", 10_000],
    ["the smallest share", "0.01", 1],
  ])("reads %s", (_label, input, bps) => {
    expect(percentToBps(input)).toBe(bps);
  });

  it.each([
    ["zero", "0"],
    ["more than 100", "100.01"],
    ["three decimals", "33.333"],
    ["a negative share", "-50"],
    ["text", "half"],
    ["nothing", ""],
  ])("refuses %s", (_label, input) => {
    expect(percentToBps(input)).toBeNull();
  });
});

describe("bpsToPercentInput", () => {
  it.each([
    ["a whole percentage", 5000, "en", "50"],
    ["two decimals in French", 3333, "fr", "33,33"],
    ["one significant decimal", 1250, "en", "12.5"],
    ["a hundredth", 1, "en", "0.01"],
  ])("writes %s", (_label, bps, locale, expected) => {
    expect(bpsToPercentInput(bps, locale)).toBe(expected);
  });

  it("round-trips through percentToBps", () => {
    expect(percentToBps(bpsToPercentInput(3305, "fr"))).toBe(3305);
  });
});
