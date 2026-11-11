import type { Transaction } from "@budgetly/contract";
import { describe, expect, it } from "vitest";
import { draftFromTransaction, draftFromTransferLegs } from "./duplicate";

const MAIN = "3f6c1d2e-8a4b-4c1e-9f0a-1b2c3d4e5f60";
const SAVINGS = "7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d";
const GROCERIES = "5b1e2d3c-4f5a-4b6c-9d7e-8f9a0b1c2d3e";
const ME = "2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a";
const TRANSFER = "9c0d1e2f-3a4b-4c5d-8e6f-7a8b9c0d1e2f";

const today = new Date(2026, 10, 11);
const newKey = () => "fresh-key";

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: "1e2f3a4b-5c6d-4e7f-8a9b-0c1d2e3f4a5b",
    accountId: MAIN,
    direction: "expense",
    amountMinor: 2068,
    occurredOn: "2026-10-02",
    name: "Supermarket",
    note: "weekly shop",
    categoryId: GROCERIES,
    beneficiaryId: ME,
    transferId: null,
    tags: ["home"],
    createdAt: "2026-10-02T10:00:00.000Z",
    updatedAt: "2026-10-02T10:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

describe("draftFromTransaction", () => {
  it("copies the entry, dates it today and gives it a new key", () => {
    const source = tx({});
    const draft = draftFromTransaction(source, { today, newKey });
    expect(draft).toEqual({
      kind: "expense",
      name: "Supermarket",
      amountMinor: 2068,
      accountId: MAIN,
      categoryId: GROCERIES,
      beneficiaryId: ME,
      tags: ["home"],
      occurredOn: today,
      idempotencyKey: "fresh-key",
    });
    expect(draft).not.toHaveProperty("id");
    expect(draft.tags).not.toBe(source.tags);
  });

  it("keeps income as income", () => {
    expect(draftFromTransaction(tx({ direction: "income" }), { today, newKey }).kind).toBe(
      "income",
    );
  });

  it("generates a different key on each call by default", () => {
    const source = tx({});
    expect(draftFromTransaction(source).idempotencyKey).not.toBe(
      draftFromTransaction(source).idempotencyKey,
    );
  });
});

describe("draftFromTransferLegs", () => {
  const outgoing = tx({
    direction: "transfer_out",
    accountId: MAIN,
    amountMinor: 50000,
    name: "Top-up",
    transferId: TRANSFER,
    categoryId: null,
    beneficiaryId: null,
    tags: [],
  });
  const incoming = { ...outgoing, direction: "transfer_in" as const, accountId: SAVINGS };

  it("takes both accounts and the amount from the legs, dated today", () => {
    expect(draftFromTransferLegs([incoming, outgoing], { today, newKey })).toEqual({
      kind: "transfer",
      name: "Top-up",
      fromAccountId: MAIN,
      toAccountId: SAVINGS,
      sentAmountMinor: 50000,
      receivedAmountMinor: undefined,
      occurredOn: today,
      idempotencyKey: "fresh-key",
    });
  });

  it("keeps a received amount that differs from the sent one", () => {
    const draft = draftFromTransferLegs([outgoing, { ...incoming, amountMinor: 49850 }], {
      today,
      newKey,
    });
    expect(draft.receivedAmountMinor).toBe(49850);
  });

  it("leaves the missing side empty when only one leg is known", () => {
    const draft = draftFromTransferLegs([incoming], { today, newKey });
    expect(draft.fromAccountId).toBe("");
    expect(draft.toAccountId).toBe(SAVINGS);
    expect(draft.sentAmountMinor).toBe(50000);
  });
});
