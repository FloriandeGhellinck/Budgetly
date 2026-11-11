import { describe, expect, it } from "vitest";
import {
  barWidths,
  changeTone,
  donutSegments,
  foldTail,
  formatPoints,
  formatRate,
  ringShare,
  shareBps,
  signedMoney,
} from "./figures";

describe("signedMoney", () => {
  it.each([
    ["a negative net as money out", -1234, { amountMinor: 1234, direction: "expense" }],
    ["a positive net as money in", 500, { amountMinor: 500, direction: "income" }],
    ["zero as unsigned money in", 0, { amountMinor: 0, direction: "income" }],
  ])("shows %s", (_label, minor, expected) => {
    expect(signedMoney(minor)).toEqual(expected);
  });
});

describe("formatRate", () => {
  it.each([
    ["a whole percentage", 2500, "en", "25%"],
    ["one decimal", 2550, "en", "25.5%"],
    ["rounded to one decimal", 3333, "en", "33.3%"],
    ["a negative rate", -1200, "en", "-12%"],
    ["French separators", 2550, "fr", "25,5\u00A0%"],
  ])("formats %s", (_label, bps, locale, expected) => {
    expect(formatRate(bps, locale)).toBe(expected);
  });
});

describe("formatPoints", () => {
  it.each([
    ["a rise", 250, "+2.5"],
    ["a fall", -1000, "-10"],
    ["no change, unsigned", 0, "0"],
    ["a sub-point change", 5, "+0.1"],
  ])("formats %s", (_label, bps, expected) => {
    expect(formatPoints(bps, "en")).toBe(expected);
  });
});

describe("changeTone", () => {
  it.each([
    ["more spending", "spending", 100, "bad"],
    ["less spending", "spending", -100, "good"],
    ["more income", "income", 100, "good"],
    ["less saving", "saving", -100, "bad"],
    ["a higher savings rate", "savingsRate", 250, "good"],
    ["no change", "net", 0, "neutral"],
    ["an unknown rate change", "savingsRate", null, "neutral"],
  ] as const)("calls %s %s", (_label, figure, change, tone) => {
    expect(changeTone(figure, change)).toBe(tone);
  });
});

describe("barWidths", () => {
  it("scales each total to the largest", () => {
    expect(barWidths([200, 100, 50])).toEqual([100, 50, 25]);
  });

  it("scales to a larger shared total", () => {
    expect(barWidths([50], 200)).toEqual([25]);
  });

  it("draws nothing when every total is zero", () => {
    expect(barWidths([0, 0])).toEqual([0, 0]);
  });
});

describe("shareBps", () => {
  it("gives the share in basis points, 0 without a total", () => {
    expect(shareBps(1, 3)).toBe(3333);
    expect(shareBps(2, 3)).toBe(6667);
    expect(shareBps(5, 0)).toBe(0);
  });
});

describe("ringShare", () => {
  it("clamps the rate to an empty or full ring", () => {
    expect(ringShare(2550)).toBe(25.5);
    expect(ringShare(12000)).toBe(100);
    expect(ringShare(-100)).toBe(0);
  });
});

describe("donutSegments", () => {
  it("lays parts end to end on 100 units, each shortened by the gap", () => {
    const segments = donutSegments(
      [{ totalMinor: 300 }, { totalMinor: 100 }, { totalMinor: 0 }],
      1,
    );
    expect(segments.map((s) => [s.offset, s.length])).toEqual([
      [0, 74],
      [75, 24],
    ]);
  });

  it("draws a lone part as a full ring", () => {
    expect(donutSegments([{ totalMinor: 5 }], 1).map((s) => s.length)).toEqual([100]);
  });
});

describe("foldTail", () => {
  const other = (rest: readonly { totalMinor: number }[]) => ({
    totalMinor: rest.reduce((sum, item) => sum + item.totalMinor, 0),
  });

  it("sums the parts past max - 1 into one", () => {
    const items = [5, 4, 3, 2, 1].map((totalMinor) => ({ totalMinor }));
    expect(foldTail(items, 3, other).map((i) => i.totalMinor)).toEqual([5, 4, 6]);
  });

  it("keeps a list that fits", () => {
    expect(foldTail([{ totalMinor: 1 }], 3, other)).toHaveLength(1);
  });
});
