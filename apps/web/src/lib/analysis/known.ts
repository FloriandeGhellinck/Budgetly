import type { EntryOptions } from "@/lib/entry-options";
import type { KnownIds } from "./view";

// The ids the user still has, from the entry options, for pruneView.
export function knownIds(options: EntryOptions): KnownIds {
  return {
    groupIds: new Set(options.categoryGroups.map((g) => g.id)),
    categoryIds: new Set(options.categoryGroups.flatMap((g) => g.categories.map((c) => c.id))),
    beneficiaryIds: new Set(options.beneficiaries.map((b) => b.id)),
    accountIds: new Set(options.accounts.map((a) => a.id)),
    tagIds: new Set(options.tags.map((t) => t.id)),
  };
}
