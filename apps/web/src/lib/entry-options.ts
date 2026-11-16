import "server-only";
import type { CategoryColor, CategoryIcon } from "@budgetly/contract";
import { getMessages } from "next-intl/server";
import { cache } from "react";
import { getApi } from "@/lib/api/server";
import { seedLabel } from "@/lib/i18n/seed-label";

export type Option = { id: string; label: string };
export type AccountOption = Option & { archived: boolean };
// The colour and icon a group or category is shown with (ADR 0034).
export type Appearance = { color: CategoryColor; icon: CategoryIcon };
// A category's appearance is resolved: its own, else its group's.
export type CategoryOption = Option & Appearance;
export type CategoryGroupOption = Option &
  Appearance & {
    direction: "expense" | "income";
    // Expense groups: spending or saving (ADR 0004); null for income.
    kind: "spending" | "saving" | null;
    categories: CategoryOption[];
  };

// Everything a transaction form or list needs to name accounts, categories,
// beneficiaries and tags, with defaults translated. Fetched once per request.
export type EntryOptions = {
  // Archived accounts included, so old transactions keep their account's name;
  // forms offer only the active ones.
  accounts: AccountOption[];
  categoryGroups: CategoryGroupOption[];
  beneficiaries: Option[];
  // Tags have no translation: the label is the stored name.
  tags: Option[];
};

export const getEntryOptions = cache(async (): Promise<EntryOptions> => {
  const api = await getApi();
  const load = () =>
    Promise.all([
      api.accounts.list({ includeArchived: true }),
      api.categories.list({}),
      api.beneficiaries.list({}),
      api.tags.list({}),
    ]);
  let [accounts, categories, beneficiaries, tags] = await load();
  // Sign-in bootstraps the user (auth/confirm); this covers a failed or
  // skipped bootstrap so the forms never open without an account.
  if (accounts.items.length === 0) {
    const { created } = await api.me.bootstrap({});
    if (created) [accounts, categories, beneficiaries, tags] = await load();
  }

  const { seed } = await getMessages();
  return {
    accounts: accounts.items.map((a) => ({
      id: a.id,
      label: seedLabel(seed, "accounts", a),
      archived: a.archivedAt !== null,
    })),
    categoryGroups: categories.groups.map((group) => ({
      id: group.id,
      label: seedLabel(seed, "categoryGroups", group),
      direction: group.direction,
      kind: group.kind,
      color: group.color,
      icon: group.icon,
      categories: group.categories.map((c) => ({
        id: c.id,
        label: seedLabel(seed, "categories", c),
        color: c.color ?? group.color,
        icon: c.icon ?? group.icon,
      })),
    })),
    beneficiaries: beneficiaries.items.map((b) => ({
      id: b.id,
      label: seedLabel(seed, "beneficiaries", b),
    })),
    tags: tags.items.map((tag) => ({ id: tag.id, label: tag.name })),
  };
});

export { optionLabels, type OptionLabels } from "./entry-options-labels";
