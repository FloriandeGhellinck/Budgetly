"use server";

import type { Category, CategoryColor, CategoryGroup, CategoryIcon } from "@budgetly/contract";
import type { ActionResult } from "@/lib/action-result";
import { runWrite } from "@/lib/api/action";

// Server actions for the Categories screen; the API validates every input.

export async function createCategory(
  groupId: string,
  name: string,
): Promise<ActionResult<Category>> {
  return runWrite((api) => api.categories.create({ groupId, name }));
}

export async function renameCategory(id: string, name: string): Promise<ActionResult<Category>> {
  return runWrite((api) => api.categories.update({ id, name }));
}

// Refused with CATEGORY_IN_USE while any transaction uses it (ADR 0027).
export async function deleteCategory(id: string): Promise<ActionResult<{ id: string }>> {
  return runWrite((api) => api.categories.delete({ id }));
}

// Null colour or icon: the category wears its group's again.
export async function restyleCategory(
  id: string,
  look: { color: CategoryColor | null; icon: CategoryIcon | null },
): Promise<ActionResult<Category>> {
  return runWrite((api) => api.categories.update({ id, ...look }));
}

export async function restyleGroup(
  id: string,
  look: { color: CategoryColor; icon: CategoryIcon },
): Promise<ActionResult<CategoryGroup>> {
  return runWrite((api) => api.categories.updateGroup({ id, ...look }));
}
