import { describe, expect, it } from "vitest";
import { periodLabel } from "./period-label";

const en = (date: Date, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", options).format(date);

describe("periodLabel", () => {
  it.each([
    { label: "one month", range: { from: "2026-11-01", to: "2026-11-30" }, text: "November 2026" },
    { label: "months", range: { from: "2026-09-01", to: "2026-11-30" }, text: "Sept – Nov 2026" },
    {
      label: "months across years",
      range: { from: "2025-12-01", to: "2026-11-30" },
      text: "Dec 2025 – Nov 2026",
    },
    { label: "days", range: { from: "2026-10-03", to: "2026-11-20" }, text: "3 Oct – 20 Nov 2026" },
  ])("$label", ({ range, text }) => {
    expect(periodLabel(range, en)).toBe(text);
  });
});
