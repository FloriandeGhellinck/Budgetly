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
let cryptoCard: string;

beforeAll(async () => {
  api = await createTestApi();
  [alice, bob] = await Promise.all([signUpSeeded(api), signUpSeeded(api)]);
  cryptoCard = (await alice.client.accounts.create({ name: "Crypto card", currency: "EURC" })).id;
});

afterAll(async () => {
  await api.close();
});

function transfer(
  overrides: Partial<Parameters<SeededUser["client"]["transfers"]["create"]>[0]> = {},
) {
  return alice.client.transfers.create({
    fromAccountId: alice.accountId,
    toAccountId: cryptoCard,
    sentAmountMinor: 50000,
    occurredOn: "2026-11-05",
    idempotencyKey: newKey(),
    ...overrides,
  });
}

async function storedLegs(transferId: string) {
  return api.admin.select().from(transactions).where(eq(transactions.transferId, transferId));
}

describe("transfers.create", () => {
  it("writes two legs, each with its own amount", async () => {
    const created = await transfer({ receivedAmountMinor: 49850 });

    expect(created.outgoing).toMatchObject({
      direction: "transfer_out",
      accountId: alice.accountId,
      amountMinor: 50000,
    });
    expect(created.incoming).toMatchObject({
      direction: "transfer_in",
      accountId: cryptoCard,
      amountMinor: 49850,
    });
    expect(await storedLegs(created.transferId)).toHaveLength(2);
  });

  it("receives the sent amount when no received amount is given", async () => {
    const created = await transfer();

    expect(created.incoming.amountMinor).toBe(50000);
  });

  it("returns the original transfer when retried with the same key", async () => {
    const idempotencyKey = newKey();

    const first = await transfer({ idempotencyKey });
    const retry = await transfer({ idempotencyKey });

    expect(retry).toEqual(first);
  });

  it("refuses a key already used by a plain transaction", async () => {
    const idempotencyKey = newKey();
    await alice.client.transactions.create({
      direction: "expense",
      amountMinor: 100,
      occurredOn: "2026-11-05",
      name: "Coffee",
      accountId: alice.accountId,
      idempotencyKey,
    });

    expect(await errorCode(transfer({ idempotencyKey }))).toBe("IDEMPOTENCY_KEY_CONFLICT");
  });

  it("refuses the same account on both sides", async () => {
    expect(await errorCode(transfer({ toAccountId: alice.accountId }))).toBe(
      "TRANSFER_SAME_ACCOUNT",
    );
  });
});

describe("transfers.delete and restore", () => {
  it("soft-deletes and restores both legs together", async () => {
    const created = await transfer();

    const deleted = await alice.client.transfers.delete({ transferId: created.transferId });
    const deletedAt = (await storedLegs(created.transferId)).map((leg) => leg.deletedAt);
    const restored = await alice.client.transfers.restore({ transferId: created.transferId });

    expect(deleted.outgoing.deletedAt).not.toBeNull();
    expect(deletedAt.every((at) => at !== null)).toBe(true);
    expect([restored.outgoing.deletedAt, restored.incoming.deletedAt]).toEqual([null, null]);
  });

  it.each([
    {
      label: "update",
      call: (id: string) => alice.client.transactions.update({ id, amountMinor: 1 }),
    },
    { label: "delete", call: (id: string) => alice.client.transactions.delete({ id }) },
    { label: "restore", call: (id: string) => alice.client.transactions.restore({ id }) },
  ])("refuses to $label a single leg through transactions", async ({ call }) => {
    const created = await transfer();

    expect(await errorCode(call(created.outgoing.id))).toBe("TRANSFER_LEG");
  });
});

describe("transfers: another user", () => {
  it("cannot move money from their account: NOT_FOUND", async () => {
    const code = await errorCode(
      bob.client.transfers.create({
        fromAccountId: alice.accountId,
        toAccountId: bob.accountId,
        sentAmountMinor: 100,
        occurredOn: "2026-11-05",
        idempotencyKey: newKey(),
      }),
    );

    expect(code).toBe("NOT_FOUND");
  });

  it.each([
    { label: "delete", call: (transferId: string) => bob.client.transfers.delete({ transferId }) },
    {
      label: "restore",
      call: (transferId: string) => bob.client.transfers.restore({ transferId }),
    },
  ])("cannot $label theirs: NOT_FOUND, legs unchanged", async ({ call }) => {
    const created = await transfer();
    const before = await storedLegs(created.transferId);

    expect(await errorCode(call(created.transferId))).toBe("NOT_FOUND");
    expect(await storedLegs(created.transferId)).toEqual(before);
  });
});
