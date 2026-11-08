// Writes a plan through the API procedures, so every business rule, RLS and
// idempotency key applies as for any other caller (ADR 0033). Safe to re-run:
// references are looked up before they are created, and each transaction
// carries a deterministic idempotency key.
import type { Contract } from "@expense/contract";
import type { Db } from "@expense/db";
import type { ContractRouterClient } from "@orpc/contract";
import { createRouterClient } from "@orpc/server";
import { router } from "../router.ts";
import {
  ACCOUNT_NAME,
  CHILDREN_BENEFICIARY,
  type BeneficiaryRef,
  type ExpenseGroupKey,
  type ImportPlan,
} from "./mapping.ts";

export type ImportClient = ContractRouterClient<Contract>;

// The real router in-process, as this user: handlers, withUser and RLS apply.
// Holding the database URL already grants access to every user's rows, so the
// import trusts the operator instead of a Supabase token (ADR 0033).
export function createImportClient(db: Db, userId: string): ImportClient {
  const token = "notion-import";
  return createRouterClient(router, {
    context: {
      db,
      authorization: `Bearer ${token}`,
      verifyToken: async (candidate) => (candidate === token ? { userId, aal: "aal2" } : null),
    },
  });
}

export type ImportResult = {
  // Recorded by this run vs. already recorded by an earlier one.
  created: number;
  replayed: number;
  createdAccount: boolean;
  createdBeneficiary: boolean;
  createdCategories: string[];
};

// Names compare like a person would read them: trimmed, case and Unicode
// form ignored.
const sameName = (a: string, b: string) =>
  a.trim().normalize("NFC").toLocaleLowerCase("fr") ===
  b.trim().normalize("NFC").toLocaleLowerCase("fr");

// Live transactions on the account, a page of 200 at a time.
async function countOnAccount(client: ImportClient, accountId: string): Promise<number> {
  let count = 0;
  let cursor: string | undefined;
  do {
    const page = await client.transactions.list({ accountId, limit: 200, cursor });
    count += page.items.length;
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return count;
}

export async function runImport(
  client: ImportClient,
  plan: ImportPlan,
  onProgress: (done: number, total: number) => void = () => {},
): Promise<ImportResult> {
  // Creates the defaults (groups, income categories, Me) for a user who never signed in.
  await client.me.bootstrap({});

  const { items: accounts } = await client.accounts.list({ includeArchived: true });
  let account = accounts.find((a) => sameName(a.name, ACCOUNT_NAME));
  const createdAccount = !account;
  account ??= await client.accounts.create({ name: ACCOUNT_NAME, shareBps: 10_000 });
  const accountId = account.id;

  const { items: people } = await client.beneficiaries.list({});
  const me = people.find((b) => b.seedKey === "me");
  if (!me) throw new Error('No beneficiary with seed key "me": was it renamed? Restore it first.');
  let children = people.find((b) => sameName(b.name, CHILDREN_BENEFICIARY));
  const needsChildren = plan.expenses.some((e) => e.beneficiary === "children");
  const createdBeneficiary = needsChildren && !children;
  if (needsChildren) children ??= await client.beneficiaries.create({ name: CHILDREN_BENEFICIARY });
  const beneficiaryIds: Record<BeneficiaryRef, string | undefined> = {
    me: me.id,
    children: children?.id,
  };

  const { groups } = await client.categories.list({});
  const group = (seedKey: string) => {
    const found = groups.find((g) => g.seedKey === seedKey);
    if (!found) throw new Error(`No category group with seed key "${seedKey}": restore it first.`);
    return found;
  };

  const incomeCategoryIds = new Map(group("income").categories.map((c) => [c.seedKey, c.id]));
  const categoryIds = new Map<string, string>();
  const createdCategories: string[] = [];
  const categoryId = async (groupKey: ExpenseGroupKey, name: string) => {
    const cacheKey = `${groupKey}\u001f${name}`;
    const cached = categoryIds.get(cacheKey);
    if (cached) return cached;
    const target = group(groupKey);
    const existing = target.categories.find((c) => sameName(c.name, name));
    const id = existing?.id ?? (await client.categories.create({ groupId: target.id, name })).id;
    if (!existing) createdCategories.push(`${groupKey} / ${name}`);
    categoryIds.set(cacheKey, id);
    return id;
  };

  const before = await countOnAccount(client, accountId);
  const total = plan.expenses.length + plan.incomes.length;
  let done = 0;
  const count = () => {
    done += 1;
    onProgress(done, total);
  };

  for (const expense of plan.expenses) {
    await client.transactions.create({
      direction: "expense",
      amountMinor: expense.amountMinor,
      occurredOn: expense.occurredOn,
      name: expense.name,
      accountId,
      categoryId: await categoryId(expense.group, expense.category),
      beneficiaryId: beneficiaryIds[expense.beneficiary],
      tags: expense.tags,
      idempotencyKey: expense.idempotencyKey,
    });
    count();
  }

  for (const income of plan.incomes) {
    const categoryIdForIncome = incomeCategoryIds.get(income.category);
    if (!categoryIdForIncome) {
      throw new Error(`No income category with seed key "${income.category}": restore it first.`);
    }
    await client.transactions.create({
      direction: "income",
      amountMinor: income.amountMinor,
      occurredOn: income.occurredOn,
      name: income.name,
      accountId,
      categoryId: categoryIdForIncome,
      idempotencyKey: income.idempotencyKey,
    });
    count();
  }

  // A replayed key returns the original row and adds none.
  const created = (await countOnAccount(client, accountId)) - before;
  return {
    created,
    replayed: total - created,
    createdAccount,
    createdBeneficiary,
    createdCategories,
  };
}
