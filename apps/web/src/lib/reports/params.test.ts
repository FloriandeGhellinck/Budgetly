import { describe, expect, it } from "vitest";
import { dashboardHref, parseDashboardParams } from "./params";

const NOW = new Date("2026-11-08T12:00:00Z");
const BENEFICIARY = "2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a";

describe("parseDashboardParams", () => {
  it("keeps a valid month and beneficiary", () => {
    expect(parseDashboardParams({ month: "2026-03", beneficiaryId: BENEFICIARY }, NOW)).toEqual({
      month: "2026-03",
      beneficiaryId: BENEFICIARY,
    });
  });

  it.each([
    ["no month", {}],
    ["a malformed month", { month: "2026-13" }],
    ["a malformed beneficiary", { beneficiaryId: "kids" }],
  ])("falls back to this month without a filter for %s", (_label, params) => {
    expect(parseDashboardParams(params, NOW)).toEqual({ month: "2026-11" });
  });
});

describe("dashboardHref", () => {
  it("leaves this month out of the URL", () => {
    expect(dashboardHref({ month: "2026-11" }, NOW)).toBe("/");
  });

  it("round-trips another month and a beneficiary", () => {
    const params = { month: "2026-10", beneficiaryId: BENEFICIARY };
    const href = dashboardHref(params, NOW);
    const search = Object.fromEntries(new URL(href, "http://x").searchParams);
    expect(parseDashboardParams(search, NOW)).toEqual(params);
  });
});
