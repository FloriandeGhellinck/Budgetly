"use server";

import type { AnalysisView, SavedView } from "@budgetly/contract";
import type { ActionResult } from "@/lib/action-result";
import { runWrite } from "@/lib/api/action";

// Server actions for saved views, the Analysis tabs (ADR 0037).

export async function createSavedView(
  name: string,
  view: AnalysisView,
): Promise<ActionResult<SavedView>> {
  return runWrite((api) => api.savedViews.create({ name, view }));
}

export async function updateSavedView(
  id: string,
  patch: { name?: string; view?: AnalysisView },
): Promise<ActionResult<SavedView>> {
  return runWrite((api) => api.savedViews.update({ id, ...patch }));
}

export async function deleteSavedView(id: string): Promise<ActionResult<{ id: string }>> {
  return runWrite((api) => api.savedViews.delete({ id }));
}
