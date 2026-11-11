"use server";

import type { Account } from "@budgetly/contract";
import type { ActionResult } from "@/lib/action-result";
import { runWrite } from "@/lib/api/action";
import type { Api } from "@/lib/api/server";

// Server actions for the Accounts screen; the API validates every input.

type Input<K extends keyof Api["accounts"]> = Parameters<Api["accounts"][K]>[0];

export async function createAccount(input: Input<"create">): Promise<ActionResult<Account>> {
  return runWrite((api) => api.accounts.create(input));
}

export async function updateAccount(input: Input<"update">): Promise<ActionResult<Account>> {
  return runWrite((api) => api.accounts.update(input));
}

export async function archiveAccount(id: string): Promise<ActionResult<Account>> {
  return runWrite((api) => api.accounts.archive({ id }));
}

export async function unarchiveAccount(id: string): Promise<ActionResult<Account>> {
  return runWrite((api) => api.accounts.unarchive({ id }));
}
