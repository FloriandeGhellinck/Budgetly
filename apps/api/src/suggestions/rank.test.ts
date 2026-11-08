import { describe, expect, it } from "vitest";
import { rankSuggestions, type Candidate } from "./rank.ts";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const GROCERIES = "00000000-0000-4000-8000-0000000000c1";
const HEALTH = "00000000-0000-4000-8000-0000000000c2";

function candidate(overrides: Partial<Candidate>): Candidate {
  return {
    name: "Supermarket",
    direction: "expense",
    accountId: A,
    categoryId: GROCERIES,
    beneficiaryId: null,
    occurredOn: "2026-11-01",
    ...overrides,
  };
}

describe("rankSuggestions", () => {
  it("counts each combination once, with its latest date", () => {
    const ranked = rankSuggestions(
      "supermarket",
      [candidate({ occurredOn: "2026-10-01" }), candidate({ occurredOn: "2026-11-03" })],
      3,
    );

    expect(ranked).toEqual([
      {
        direction: "expense",
        accountId: A,
        categoryId: GROCERIES,
        beneficiaryId: null,
        occurrences: 2,
        lastUsedOn: "2026-11-03",
      },
    ]);
  });

  it.each([
    {
      label: "the more frequent combination first",
      query: "supermarket",
      candidates: [candidate({ categoryId: HEALTH }), candidate({}), candidate({})],
      first: GROCERIES,
    },
    {
      label: "the more recent combination on equal frequency",
      query: "supermarket",
      candidates: [
        candidate({ occurredOn: "2026-10-01" }),
        candidate({ categoryId: HEALTH, occurredOn: "2026-11-02" }),
      ],
      first: HEALTH,
    },
    {
      label: "an exact name match over a more frequent partial one",
      query: "Pharmacy",
      candidates: [
        candidate({ name: "Pharmacy Supermarket" }),
        candidate({ name: "Pharmacy Supermarket" }),
        candidate({ name: "pharmacy", categoryId: HEALTH }),
      ],
      first: HEALTH,
    },
  ])("ranks $label", ({ query, candidates, first }) => {
    expect(rankSuggestions(query, candidates, 3)[0]?.categoryId).toBe(first);
  });

  it("returns at most limit suggestions", () => {
    const candidates = [
      candidate({}),
      candidate({ accountId: B }),
      candidate({ categoryId: HEALTH }),
    ];

    expect(rankSuggestions("supermarket", candidates, 2)).toHaveLength(2);
  });
});
