import { describe, expect, it } from "vitest";
import {
  type AnalysisPreset,
  AnalysisView,
  comparisonRange,
  parseStoredView,
  resolvePeriod,
} from "./analysis";

describe("resolvePeriod", () => {
  it.each<{ preset: AnalysisPreset; today: string; from: string; to: string }>([
    { preset: "this-month", today: "2026-11-16", from: "2026-11-01", to: "2026-11-30" },
    { preset: "this-month", today: "2024-02-10", from: "2024-02-01", to: "2024-02-29" },
    { preset: "last-month", today: "2026-01-05", from: "2025-12-01", to: "2025-12-31" },
    { preset: "last-3-months", today: "2026-02-01", from: "2025-12-01", to: "2026-02-28" },
    { preset: "last-12-months", today: "2026-11-16", from: "2025-12-01", to: "2026-11-30" },
    { preset: "year-to-date", today: "2026-01-31", from: "2026-01-01", to: "2026-01-31" },
    { preset: "year-to-date", today: "2026-12-31", from: "2026-01-01", to: "2026-12-31" },
    { preset: "last-year", today: "2026-12-31", from: "2025-01-01", to: "2025-12-31" },
    { preset: "last-year", today: "2026-01-01", from: "2025-01-01", to: "2025-12-31" },
  ])("$preset on $today: $from → $to", ({ preset, today, from, to }) => {
    expect(resolvePeriod({ kind: "relative", preset }, today)).toEqual({ from, to });
  });

  it("keeps fixed dates as they are", () => {
    expect(
      resolvePeriod({ kind: "fixed", from: "2026-10-03", to: "2026-11-20" }, "2026-11-16"),
    ).toEqual({ from: "2026-10-03", to: "2026-11-20" });
  });
});

describe("comparisonRange", () => {
  it.each([
    {
      label: "one month → the month before",
      range: { from: "2026-03-01", to: "2026-03-31" },
      to: { from: "2026-02-01", to: "2026-02-28" },
    },
    {
      label: "January → December of the year before",
      range: { from: "2026-01-01", to: "2026-01-31" },
      to: { from: "2025-12-01", to: "2025-12-31" },
    },
    {
      label: "three whole months → the three before",
      range: { from: "2026-09-01", to: "2026-11-30" },
      to: { from: "2026-06-01", to: "2026-08-31" },
    },
    {
      label: "a day range → as many days just before",
      range: { from: "2026-03-10", to: "2026-03-19" },
      to: { from: "2026-02-28", to: "2026-03-09" },
    },
  ])("previous period: $label", ({ range, to }) => {
    expect(comparisonRange(range, "previous-period")).toEqual(to);
  });

  it.each([
    {
      label: "a month",
      range: { from: "2026-11-01", to: "2026-11-30" },
      to: { from: "2025-11-01", to: "2025-11-30" },
    },
    {
      label: "February of a leap year keeps its month end",
      range: { from: "2025-02-01", to: "2025-02-28" },
      to: { from: "2024-02-01", to: "2024-02-29" },
    },
    {
      label: "a leap day in a day range",
      range: { from: "2024-02-20", to: "2024-02-29" },
      to: { from: "2023-02-20", to: "2023-02-28" },
    },
  ])("last year: $label", ({ range, to }) => {
    expect(comparisonRange(range, "last-year")).toEqual(to);
  });
});

describe("parseStoredView", () => {
  const defaults = AnalysisView.parse({});

  it("reads a valid stored view as it is", () => {
    const view = { ...defaults, types: ["income" as const], groupBy: "month" as const };

    expect(parseStoredView(view)).toEqual(view);
  });

  it("keeps the valid fields and defaults the rest", () => {
    expect(
      parseStoredView({ types: ["income"], groupBy: "weather", period: { kind: "someday" } }),
    ).toEqual({ ...defaults, types: ["income"] });
  });

  it.each([null, "garbage", 42])("falls back to the default view for %s", (value) => {
    expect(parseStoredView(value)).toEqual(defaults);
  });
});
