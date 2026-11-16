import "server-only";
import type { AnalysisView } from "@budgetly/contract";
import { getMessages } from "next-intl/server";
import { cache } from "react";
import { getApi } from "@/lib/api/server";
import { seedLabel } from "@/lib/i18n/seed-label";

// A saved view as the tabs show it: starter views translated (ADR 0031, 0036).
export type SavedViewOption = { id: string; label: string; view: AnalysisView };

export const getSavedViews = cache(async (): Promise<SavedViewOption[]> => {
  const api = await getApi();
  const [{ items }, { seed }] = await Promise.all([api.savedViews.list({}), getMessages()]);
  return items.map((item) => ({
    id: item.id,
    label: seedLabel(seed, "savedViews", item),
    view: item.view,
  }));
});
