import { transactions } from "@expense/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createTestApi,
  errorCode,
  newKey,
  signUpSeeded,
  type SeededUser,
  type TestApi,
} from "../test-support.ts";

let api: TestApi;
let alice: SeededUser;
let bob: SeededUser;

beforeAll(async () => {
  api = await createTestApi();
  [alice, bob] = await Promise.all([signUpSeeded(api), signUpSeeded(api)]);
});

afterAll(async () => {
  await api.close();
});

function expense(
  user: SeededUser,
  overrides: Partial<Parameters<SeededUser["client"]["transactions"]["create"]>[0]> = {},
) {
  return user.client.transactions.create({
    direction: "expense",
    amountMinor: 2068,
    occurredOn: "2026-11-08",
    name: "Supermarket",
    accountId: user.accountId,
    categoryId: user.categoryId("groceries"),
    idempotencyKey: newKey(),
    ...overrides,
  });
}

async function storedTransaction(id: string) {
  const [row] = await api.admin.select().from(transactions).where(eq(transactions.id, id));
  return row;
}

describe("transactions.create", () => {
  it("records an expense with its amount in cents, references and tags", async () => {
    const created = await expense(alice, {
      beneficiaryId: alice.beneficiaryId,
      tags: ["Weekly shop"],
    });

    expect(created).toMatchObject({
      direction: "expense",
      amountMinor: 2068,
      occurredOn: "2026-11-08",
      categoryId: alice.categoryId("groceries"),
      beneficiaryId: alice.beneficiaryId,
      transferId: null,
      tags: ["Weekly shop"],
      deletedAt: null,
    });
    expect((await storedTransaction(created.id))?.amountMinor).toBe(2068);
  });

  it("returns the original transaction when retried with the same key", async () => {
    const idempotencyKey = newKey();

    const first = await expense(alice, { idempotencyKey });
    const retry = await expense(alice, { idempotencyKey, amountMinor: 9999 });

    expect(retry).toEqual(first);
    const rows = await api.admin
      .select()
      .from(transactions)
      .where(eq(transactions.idempotencyKey, idempotencyKey));
    expect(rows).toHaveLength(1);
  });

  it("writes once when two retries race", async () => {
    const idempotencyKey = newKey();

    const [first, second] = await Promise.all([
      expense(alice, { idempotencyKey }),
      expense(alice, { idempotencyKey }),
    ]);

    expect(second.id).toBe(first.id);
  });

  it("lets two users use the same key independently", async () => {
    const idempotencyKey = newKey();

    const mine = await expense(alice, { idempotencyKey });
    const theirs = await expense(bob, { idempotencyKey });

    expect(theirs.id).not.toBe(mine.id);
  });

  it("refuses an income category on an expense", async () => {
    const code = await errorCode(expense(alice, { categoryId: alice.categoryId("salary") }));

    expect(code).toBe("CATEGORY_DIRECTION_MISMATCH");
  });

  it.each([
    { label: "account", overrides: () => ({ accountId: bob.accountId }) },
    { label: "category", overrides: () => ({ categoryId: bob.categoryId("groceries") }) },
    { label: "beneficiary", overrides: () => ({ beneficiaryId: bob.beneficiaryId }) },
  ])("refuses another user's $label with NOT_FOUND", async ({ overrides }) => {
    expect(await errorCode(expense(alice, overrides()))).toBe("NOT_FOUND");
  });
});

describe("transactions.get", () => {
  it("returns a deleted transaction with its deletion date", async () => {
    const created = await expense(alice);
    await alice.client.transactions.delete({ id: created.id });

    const fetched = await alice.client.transactions.get({ id: created.id });

    expect(fetched.deletedAt).not.toBeNull();
  });
});

describe("transactions.update", () => {
  it("changes only the fields passed and replaces the tag set", async () => {
    const created = await expense(alice, { tags: ["Old"], note: "keep me" });

    const updated = await alice.client.transactions.update({
      id: created.id,
      amountMinor: 2168,
      tags: ["New"],
    });

    expect(updated).toMatchObject({
      amountMinor: 2168,
      note: "keep me",
      name: "Supermarket",
      tags: ["New"],
    });
  });

  it("clears a field set to null", async () => {
    const created = await expense(alice, { beneficiaryId: alice.beneficiaryId });

    const updated = await alice.client.transactions.update({ id: created.id, beneficiaryId: null });

    expect(updated.beneficiaryId).toBeNull();
  });

  it("refuses a direction change that leaves the category on the other side", async () => {
    const created = await expense(alice);

    const code = await errorCode(
      alice.client.transactions.update({ id: created.id, direction: "income" }),
    );

    expect(code).toBe("CATEGORY_DIRECTION_MISMATCH");
  });

  it("accepts a direction change together with a matching category", async () => {
    const created = await expense(alice);

    const updated = await alice.client.transactions.update({
      id: created.id,
      direction: "income",
      categoryId: alice.categoryId("other_income"),
    });

    expect(updated).toMatchObject({
      direction: "income",
      categoryId: alice.categoryId("other_income"),
    });
  });

  it("refuses a deleted transaction with NOT_FOUND", async () => {
    const created = await expense(alice);
    await alice.client.transactions.delete({ id: created.id });

    expect(await errorCode(alice.client.transactions.update({ id: created.id, name: "x" }))).toBe(
      "NOT_FOUND",
    );
  });
});

describe("transactions.delete and restore", () => {
  it("hides a deleted transaction from the list until it is restored", async () => {
    const created = await expense(alice, { name: "Undo me" });

    await alice.client.transactions.delete({ id: created.id });
    const whileDeleted = await alice.client.transactions.list({ text: "Undo me" });
    const restored = await alice.client.transactions.restore({ id: created.id });
    const afterRestore = await alice.client.transactions.list({ text: "Undo me" });

    expect(whileDeleted.items).toEqual([]);
    expect(restored.deletedAt).toBeNull();
    expect(afterRestore.items.map((t) => t.id)).toEqual([created.id]);
  });
});

describe("transactions: another user", () => {
  it("does not see them in the list", async () => {
    const created = await expense(alice, { name: "Alice private" });

    const { items } = await bob.client.transactions.list({ text: "Alice private" });

    expect(items).toEqual([]);
    expect(created.id).toBeDefined();
  });

  it.each([
    { label: "get", call: (id: string) => bob.client.transactions.get({ id }) },
    {
      label: "update",
      call: (id: string) => bob.client.transactions.update({ id, amountMinor: 1 }),
    },
    { label: "delete", call: (id: string) => bob.client.transactions.delete({ id }) },
    { label: "restore", call: (id: string) => bob.client.transactions.restore({ id }) },
  ])("cannot $label them: NOT_FOUND, row unchanged", async ({ call }) => {
    const created = await expense(alice);
    const before = await storedTransaction(created.id);

    expect(await errorCode(call(created.id))).toBe("NOT_FOUND");
    expect(await storedTransaction(created.id)).toEqual(before);
  });
});
