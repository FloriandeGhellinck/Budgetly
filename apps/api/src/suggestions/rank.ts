import type { Suggestion } from "@expense/contract";

export type Candidate = {
  name: string;
  direction: "expense" | "income";
  accountId: string;
  categoryId: string | null;
  beneficiaryId: string | null;
  occurredOn: string;
};

// Groups past transactions by (direction, account, category, beneficiary) and
// ranks the combinations (ADR 0024): one used under exactly this name first,
// then the most frequent, then the most recently used.
export function rankSuggestions(
  query: string,
  candidates: readonly Candidate[],
  limit: number,
): Suggestion[] {
  const wanted = query.trim().toLowerCase();
  const groups = new Map<string, Suggestion & { exact: boolean }>();
  for (const candidate of candidates) {
    const key = [
      candidate.direction,
      candidate.accountId,
      candidate.categoryId,
      candidate.beneficiaryId,
    ].join("|");
    const exact = candidate.name.trim().toLowerCase() === wanted;
    const group = groups.get(key);
    if (group) {
      group.occurrences += 1;
      group.exact ||= exact;
      if (candidate.occurredOn > group.lastUsedOn) group.lastUsedOn = candidate.occurredOn;
    } else {
      groups.set(key, {
        direction: candidate.direction,
        accountId: candidate.accountId,
        categoryId: candidate.categoryId,
        beneficiaryId: candidate.beneficiaryId,
        occurrences: 1,
        lastUsedOn: candidate.occurredOn,
        exact,
      });
    }
  }
  return [...groups.values()]
    .toSorted(
      (a, b) =>
        Number(b.exact) - Number(a.exact) ||
        b.occurrences - a.occurrences ||
        b.lastUsedOn.localeCompare(a.lastUsedOn),
    )
    .slice(0, limit)
    .map(({ exact: _exact, ...suggestion }) => suggestion);
}
