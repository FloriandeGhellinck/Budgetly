import { z } from "zod";
import { EntryDirection, Id, IsoDate } from "./common";
import { procedure } from "./procedure";

export const SuggestionSchema = z.object({
  direction: EntryDirection,
  accountId: Id,
  categoryId: Id.nullable(),
  beneficiaryId: Id.nullable(),
  // How many past transactions with a similar name used this combination.
  occurrences: z.int(),
  lastUsedOn: IsoDate,
});
export type Suggestion = z.infer<typeof SuggestionSchema>;

export const SUGGESTION_LIMIT_MAX = 10;

const forName = procedure({
  description:
    "Suggest direction, account, category and beneficiary for a new transaction from the caller's own history (ADR 0024): past transactions whose name contains the given text, case-insensitively, grouped by combination. Exact name matches rank first, then the most frequent, then the most recent. Empty when nothing similar exists. Use the first suggestion to pre-fill transactions.create.",
  examples: [{ name: "Supermarket" }, { name: "grocer", limit: 1 }],
  readOnly: true,
  idempotent: true,
  input: z.object({
    name: z.string().trim().min(2).max(200),
    limit: z.int().min(1).max(SUGGESTION_LIMIT_MAX).default(3),
  }),
  output: z.object({ suggestions: z.array(SuggestionSchema) }),
  errors: {},
});

export const suggestionsContract = { forName };
