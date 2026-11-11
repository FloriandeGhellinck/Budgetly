import type { Suggestion } from "@budgetly/contract";

export type SuggestedFields = {
  direction: "expense" | "income";
  accountId: string;
  categoryId: string | null;
  beneficiaryId: string | null;
};

export type SuggestableField = keyof SuggestedFields;

// A suggestion from history (ADR 0024) fills only the fields the user has not
// set by hand, and never points at an account the form cannot offer.
export function applySuggestion(
  current: SuggestedFields,
  suggestion: Suggestion,
  touched: ReadonlySet<SuggestableField>,
  activeAccountIds: ReadonlySet<string>,
): SuggestedFields {
  const next = { ...current };
  if (!touched.has("direction")) next.direction = suggestion.direction;
  if (!touched.has("accountId") && activeAccountIds.has(suggestion.accountId)) {
    next.accountId = suggestion.accountId;
  }
  // The category belongs to the suggestion's direction; keep it only if that
  // is the direction the form ends up with.
  if (!touched.has("categoryId") && next.direction === suggestion.direction) {
    next.categoryId = suggestion.categoryId;
  }
  if (!touched.has("beneficiaryId")) next.beneficiaryId = suggestion.beneficiaryId;
  return next;
}
