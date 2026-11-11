import { describe, expect, it } from "vitest";
import { fromIsoDay, monthDays, monthOf, shiftMonth, toIsoDay } from "./dates";

describe("toIsoDay", () => {
  it("uses the local day, not the UTC one", () => {
    // 00:30 local on 1 March: in any zone east of UTC that instant is still February in UTC.
    expect(toIsoDay(new Date(2026, 2, 1, 0, 30))).toBe("2026-03-01");
  });

  it("round-trips through fromIsoDay", () => {
    expect(toIsoDay(fromIsoDay("2026-11-08"))).toBe("2026-11-08");
  });
});

describe("monthOf", () => {
  it("reads the month in the given zone, not UTC", () => {
    // 23:30 UTC on 31 October is already 1 November in Brussels.
    expect(monthOf(new Date("2026-10-31T23:30:00Z"), "Europe/Brussels")).toBe("2026-11");
    expect(monthOf(new Date("2026-10-31T23:30:00Z"), "UTC")).toBe("2026-10");
  });
});

describe("shiftMonth", () => {
  it.each([
    ["the next month", "2026-11", 1, "2026-12"],
    ["across a year end", "2026-12", 1, "2027-01"],
    ["back across a year start", "2026-01", -1, "2025-12"],
    ["back eleven months", "2026-11", -11, "2025-12"],
  ])("moves to %s", (_label, month, delta, expected) => {
    expect(shiftMonth(month, delta)).toBe(expected);
  });
});

describe("monthDays", () => {
  it.each([
    ["a 30-day month", "2026-11", "2026-11-30"],
    ["a 31-day month", "2026-12", "2026-12-31"],
    ["February", "2026-02", "2026-02-28"],
    ["February in a leap year", "2028-02", "2028-02-29"],
  ])("ends %s on its last day", (_label, month, to) => {
    expect(monthDays(month)).toEqual({ from: `${month}-01`, to });
  });
});
