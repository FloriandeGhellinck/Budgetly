import { describe, expect, it } from "vitest";
import { filtersToSearch, parseFilters, withFilter } from "./filters";

const ACCOUNT = "3f6c1d2e-8a4b-4c1e-9f0a-1b2c3d4e5f60";

describe("parseFilters", () => {
  it("keeps valid filters", () => {
    expect(
      parseFilters({
        text: "supermarket",
        direction: "expense",
        accountId: ACCOUNT,
        from: "2026-11-01",
      }),
    ).toEqual({ text: "supermarket", direction: "expense", accountId: ACCOUNT, from: "2026-11-01" });
  });

  it.each([
    ["an unknown direction", { direction: "refund" }],
    ["a malformed id", { accountId: "42" }],
    ["a malformed day", { from: "01/11/2026" }],
    ["blank text", { text: "   " }],
    ["an unknown key", { page: "2" }],
  ])("drops %s", (_label, params) => {
    expect(parseFilters(params)).toEqual({});
  });

  it("reads the first of repeated values", () => {
    expect(parseFilters({ direction: ["income", "expense"] })).toEqual({ direction: "income" });
  });
});

describe("filtersToSearch", () => {
  it("writes keys in a stable order and round-trips", () => {
    const search = filtersToSearch({ text: "rent", direction: "expense" });
    expect(search).toBe("?direction=expense&text=rent");
    expect(parseFilters(Object.fromEntries(new URLSearchParams(search)))).toEqual({
      direction: "expense",
      text: "rent",
    });
  });

  it("is empty without filters", () => {
    expect(filtersToSearch({})).toBe("");
  });
});

describe("withFilter", () => {
  it("removes a filter set to an empty value", () => {
    expect(withFilter({ text: "rent", direction: "expense" }, "text", "")).toEqual({
      direction: "expense",
    });
  });
});
