import { pgError } from "@budgetly/test-db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accounts, categories, categoryGroups, tags, transactions } from "./schema";
import {
  ALICE,
  createMigratedDatabase,
  insertOwnedRows,
  type MigratedDatabase,
  type OwnedRows,
} from "./test-support";

let db: MigratedDatabase;
let alice: OwnedRows;
let incomeCategoryId: string;

beforeAll(async () => {
  db = await createMigratedDatabase();
  alice = await insertOwnedRows(db.admin, ALICE);
  const [group] = await db.admin
    .insert(categoryGroups)
    .values({ userId: ALICE, name: "Income", direction: "income" })
    .returning();
  if (!group) throw new Error("fixture insert returned no row");
  const [category] = await db.admin
    .insert(categories)
    .values({ userId: ALICE, groupId: group.id, direction: "income", name: "Salary" })
    .returning();
  if (!category) throw new Error("fixture insert returned no row");
  incomeCategoryId = category.id;
});

afterAll(async () => {
  await db.close();
});

const TRANSFER_ID = "00000000-0000-0000-0000-0000000000f1";

function expense(overrides: Partial<typeof transactions.$inferInsert> = {}) {
  return {
    userId: ALICE,
    accountId: alice.accountId,
    direction: "expense" as const,
    amountMinor: 100,
    occurredOn: "2026-11-08",
    name: "Bakery",
    ...overrides,
  };
}

describe("transactions", () => {
  it.each([
    {
      label: "a zero amount",
      row: () => expense({ amountMinor: 0 }),
      constraint: "transactions_amount_minor_positive",
    },
    {
      label: "a negative amount",
      row: () => expense({ amountMinor: -100 }),
      constraint: "transactions_amount_minor_positive",
    },
    {
      label: "a transfer leg with a category",
      row: () =>
        expense({
          direction: "transfer_out",
          transferId: TRANSFER_ID,
          categoryId: alice.categoryId,
        }),
      constraint: "transactions_transfer_shape",
    },
    {
      label: "a transfer leg with a beneficiary",
      row: () =>
        expense({
          direction: "transfer_in",
          transferId: TRANSFER_ID,
          beneficiaryId: alice.beneficiaryId,
        }),
      constraint: "transactions_transfer_shape",
    },
    {
      label: "a transfer leg without a transfer id",
      row: () => expense({ direction: "transfer_out" }),
      constraint: "transactions_transfer_shape",
    },
    {
      label: "an expense with a transfer id",
      row: () => expense({ transferId: TRANSFER_ID }),
      constraint: "transactions_transfer_shape",
    },
  ])("rejects $label", async ({ row, constraint }) => {
    const error = await pgError(db.admin.insert(transactions).values(row()));
    expect(error).toEqual({ code: "23514", constraint });
  });

  it("rejects an expense filed under an income category", async () => {
    const error = await pgError(
      db.admin.insert(transactions).values(expense({ categoryId: incomeCategoryId })),
    );
    expect(error).toEqual({ code: "23503", constraint: "transactions_category_fk" });
  });

  it("rejects a second leg of the same direction in one transfer", async () => {
    const leg = expense({ direction: "transfer_out", transferId: TRANSFER_ID });
    await db.admin.insert(transactions).values(leg);
    const error = await pgError(db.admin.insert(transactions).values(leg));
    expect(error).toEqual({ code: "23505", constraint: "transactions_transfer_leg_key" });
  });

  it("rejects a reused idempotency key", async () => {
    await db.admin.insert(transactions).values(expense({ idempotencyKey: "retry-1" }));
    const error = await pgError(
      db.admin.insert(transactions).values(expense({ idempotencyKey: "retry-1" })),
    );
    expect(error).toEqual({
      code: "23505",
      constraint: "transactions_user_id_idempotency_key_key",
    });
  });
});

describe("category groups and categories", () => {
  it("rejects a category whose direction differs from its group's", async () => {
    const error = await pgError(
      db.admin
        .insert(categories)
        .values({ userId: ALICE, groupId: alice.groupId, direction: "income", name: "Bonus" }),
    );
    expect(error).toEqual({ code: "23503", constraint: "categories_group_fk" });
  });

  it.each([
    { label: "an expense group without a kind", direction: "expense", kind: null },
    { label: "an income group with a kind", direction: "income", kind: "saving" },
  ] as const)("rejects $label", async ({ direction, kind }) => {
    const error = await pgError(
      db.admin.insert(categoryGroups).values({ userId: ALICE, name: "Odd", direction, kind }),
    );
    expect(error).toEqual({ code: "23514", constraint: "category_groups_kind_expense_only" });
  });

  it("rejects a group for transfers", async () => {
    const error = await pgError(
      db.admin
        .insert(categoryGroups)
        .values({ userId: ALICE, name: "Moves", direction: "transfer_out", kind: "spending" }),
    );
    expect(error).toEqual({ code: "23514", constraint: "category_groups_direction" });
  });
});

describe("accounts", () => {
  it.each([0, 10001])("rejects a share of %i basis points", async (shareBps) => {
    const error = await pgError(
      db.admin.insert(accounts).values({ userId: ALICE, name: "Odd", shareBps }),
    );
    expect(error).toEqual({ code: "23514", constraint: "accounts_share_bps_range" });
  });
});

describe("tags", () => {
  it("rejects a name that differs only by case", async () => {
    const error = await pgError(db.admin.insert(tags).values({ userId: ALICE, name: "HOLIDAY" }));
    expect(error).toEqual({ code: "23505", constraint: "tags_user_id_name_key" });
  });
});
