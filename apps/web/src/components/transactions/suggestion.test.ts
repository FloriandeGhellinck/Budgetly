import type { Suggestion } from "@budgetly/contract";
import { describe, expect, it } from "vitest";
import { applySuggestion, type SuggestableField, type SuggestedFields } from "./suggestion";

const MAIN = "3f6c1d2e-8a4b-4c1e-9f0a-1b2c3d4e5f60";
const JOINT = "7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d";
const GROCERIES = "5b1e2d3c-4f5a-4b6c-9d7e-8f9a0b1c2d3e";
const ME = "2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a";

const empty: SuggestedFields = {
  direction: "expense",
  accountId: MAIN,
  categoryId: null,
  beneficiaryId: null,
};

const supermarket: Suggestion = {
  direction: "expense",
  accountId: JOINT,
  categoryId: GROCERIES,
  beneficiaryId: ME,
  occurrences: 12,
  lastUsedOn: "2026-11-01",
};

const active = new Set([MAIN, JOINT]);

function apply(touched: SuggestableField[], suggestion = supermarket, accounts = active) {
  return applySuggestion(empty, suggestion, new Set(touched), accounts);
}

describe("applySuggestion", () => {
  it("fills every untouched field", () => {
    expect(apply([])).toEqual({
      direction: "expense",
      accountId: JOINT,
      categoryId: GROCERIES,
      beneficiaryId: ME,
    });
  });

  it("keeps what the user picked by hand", () => {
    expect(apply(["accountId", "categoryId"])).toEqual({
      direction: "expense",
      accountId: MAIN,
      categoryId: null,
      beneficiaryId: ME,
    });
  });

  it("drops the suggested category when the user fixed the other direction", () => {
    const result = applySuggestion(
      { ...empty, direction: "income" },
      supermarket,
      new Set<SuggestableField>(["direction"]),
      active,
    );
    expect(result.categoryId).toBeNull();
  });

  it("ignores an account the form does not offer (archived)", () => {
    expect(apply([], supermarket, new Set([MAIN])).accountId).toBe(MAIN);
  });
});
