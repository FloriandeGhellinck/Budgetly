"use server";

import type { Suggestion, Transaction, Transfer } from "@expense/contract";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { runAction } from "@/lib/api/action";
import type { Api } from "@/lib/api/server";
import { PAGE_SIZE, type TransactionFilters } from "./filters";

// Server actions for the transaction flows. Each one is a thin call to
// apps/api through runAction; the API validates every input (contract).
// Writes refresh every page, since lists, figures and tag options change.

type Input<K extends keyof Api["transactions"]> = Parameters<Api["transactions"][K]>[0];
type TransferInput = Parameters<Api["transfers"]["create"]>[0];

function refresh() {
  revalidatePath("/", "layout");
}

async function write<T>(call: (api: Api) => Promise<T>): Promise<ActionResult<T>> {
  const result = await runAction(call);
  if (result.ok) refresh();
  return result;
}

export async function createTransaction(
  input: Input<"create">,
): Promise<ActionResult<Transaction>> {
  return write((api) => api.transactions.create(input));
}

export async function updateTransaction(
  input: Input<"update">,
): Promise<ActionResult<Transaction>> {
  return write((api) => api.transactions.update(input));
}

export async function deleteTransaction(id: string): Promise<ActionResult<Transaction>> {
  return write((api) => api.transactions.delete({ id }));
}

export async function restoreTransaction(id: string): Promise<ActionResult<Transaction>> {
  return write((api) => api.transactions.restore({ id }));
}

export async function createTransfer(input: TransferInput): Promise<ActionResult<Transfer>> {
  return write((api) => api.transfers.create(input));
}

export async function deleteTransfer(transferId: string): Promise<ActionResult<Transfer>> {
  return write((api) => api.transfers.delete({ transferId }));
}

export async function restoreTransfer(transferId: string): Promise<ActionResult<Transfer>> {
  return write((api) => api.transfers.restore({ transferId }));
}

export async function suggestForName(name: string): Promise<ActionResult<Suggestion | null>> {
  return runAction(async (api) => {
    const { suggestions } = await api.suggestions.forName({ name, limit: 1 });
    return suggestions[0] ?? null;
  });
}

export type TransactionPage = { items: Transaction[]; nextCursor: string | null };

export async function loadTransactions(
  filters: TransactionFilters,
  cursor: string | null,
): Promise<ActionResult<TransactionPage>> {
  return runAction((api) =>
    api.transactions.list({ ...filters, limit: PAGE_SIZE, ...(cursor ? { cursor } : {}) }),
  );
}
