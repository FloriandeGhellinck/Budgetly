import { authed } from "../orpc.ts";
import { rankSuggestions } from "./rank.ts";
import { findCandidates } from "./repo.ts";

export const forName = authed.suggestions.forName.handler(async ({ input, context }) => ({
  suggestions: rankSuggestions(
    input.name,
    await findCandidates(context.tx, context.userId, input.name),
    input.limit,
  ),
}));

export const suggestionsRouter = { forName };
