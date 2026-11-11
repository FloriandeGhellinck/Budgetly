import { pgError } from "@budgetly/test-db";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  accounts,
  beneficiaries,
  categories,
  categoryGroups,
  tags,
  transactions,
  transactionTags,
} from "./schema";
import {
  ALICE,
  BOB,
  createMigratedDatabase,
  insertOwnedRows,
  type MigratedDatabase,
  type OwnedRows,
} from "./test-support";
import { withUser } from "./with-user";
import type { Tx } from "./client";

let db: MigratedDatabase;
let alice: OwnedRows;
let bob: OwnedRows;

beforeAll(async () => {
  db = await createMigratedDatabase();
  alice = await insertOwnedRows(db.admin, ALICE);
  bob = await insertOwnedRows(db.admin, BOB);
});

afterAll(async () => {
  await db.close();
});

const TABLES = [
  "accounts",
  "category_groups",
  "categories",
  "beneficiaries",
  "tags",
  "transactions",
  "transaction_tags",
] as const;

async function countOwnedBy(table: string, userId: string): Promise<number> {
  const rows = await db.admin.execute<{ count: number }>(
    sql`select count(*)::int as count from ${sql.identifier(table)} where user_id = ${userId}`,
  );
  return rows[0]?.count ?? -1;
}

describe("RLS coverage", () => {
  it("enables, forces and has a policy on every public table", async () => {
    const rows = await db.admin.execute<{ table: string; protected: boolean }>(sql`
      select c.relname as table,
             c.relrowsecurity and c.relforcerowsecurity
               and exists (select 1 from pg_policies p
                           where p.schemaname = 'public' and p.tablename = c.relname) as protected
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
    `);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.filter((row) => !row.protected).map((row) => row.table)).toEqual([]);
  });

  it("serves the API through a role that cannot bypass RLS", async () => {
    const rows = await db.app.execute<{ superuser: boolean; bypass: boolean }>(sql`
      select rolsuper as superuser, rolbypassrls as bypass from pg_roles where rolname = current_user
    `);
    expect(rows[0]).toEqual({ superuser: false, bypass: false });
  });
});

describe.each(TABLES)("%s: another user's rows", (table) => {
  it("are invisible", async () => {
    const rows = await withUser(db.app, ALICE, (tx) =>
      tx.execute<{ user_id: string }>(sql`select user_id from ${sql.identifier(table)}`),
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.user_id === ALICE)).toBe(true);
  });

  it("cannot be updated", async () => {
    const updated = await withUser(db.app, ALICE, (tx) =>
      tx.execute(
        sql`update ${sql.identifier(table)} set user_id = ${ALICE} where user_id = ${BOB} returning 1`,
      ),
    );
    expect(updated).toHaveLength(0);
    expect(await countOwnedBy(table, BOB)).toBe(1);
  });

  it("cannot be deleted", async () => {
    const deleted = await withUser(db.app, ALICE, (tx) =>
      tx.execute(sql`delete from ${sql.identifier(table)} where user_id = ${BOB} returning 1`),
    );
    expect(deleted).toHaveLength(0);
    expect(await countOwnedBy(table, BOB)).toBe(1);
  });
});

// Each insert names Bob as owner and points only at Bob's rows, so RLS is the
// one thing that can reject it.
const INSERTS_FOR_BOB = {
  accounts: () => ({ table: accounts, values: { userId: BOB, name: "Spy" } }),
  category_groups: () => ({
    table: categoryGroups,
    values: { userId: BOB, name: "Spy", direction: "expense", kind: "spending" } as const,
  }),
  categories: () => ({
    table: categories,
    values: { userId: BOB, groupId: bob.groupId, direction: "expense", name: "Spy" } as const,
  }),
  beneficiaries: () => ({ table: beneficiaries, values: { userId: BOB, name: "Spy" } }),
  tags: () => ({ table: tags, values: { userId: BOB, name: "Spy" } }),
  transactions: () => ({
    table: transactions,
    values: {
      userId: BOB,
      accountId: bob.accountId,
      direction: "expense",
      amountMinor: 100,
      occurredOn: "2026-11-08",
      name: "Spy",
    } as const,
  }),
  transaction_tags: () => ({
    table: transactionTags,
    values: { userId: BOB, transactionId: bob.transactionId, tagId: bob.tagId },
  }),
};

describe.each(TABLES)("%s: inserting a row for another user", (table) => {
  it("is rejected by the policy", async () => {
    const { table: target, values } = INSERTS_FOR_BOB[table]();
    const error = await pgError(
      withUser(db.app, ALICE, (tx) => tx.insert(target).values(values as never)),
    );
    expect(error.code).toBe("42501");
  });
});

describe("composite foreign keys", () => {
  // Alice's own row pointing at one of Bob's: RLS passes, the key must not.
  it.each([
    {
      label: "transaction → another user's account",
      constraint: "transactions_account_fk",
      insert: (tx: Tx) =>
        tx.insert(transactions).values({
          userId: ALICE,
          accountId: bob.accountId,
          direction: "expense",
          amountMinor: 100,
          occurredOn: "2026-11-08",
          name: "Cross",
        }),
    },
    {
      label: "transaction → another user's category",
      constraint: "transactions_category_fk",
      insert: (tx: Tx) =>
        tx.insert(transactions).values({
          userId: ALICE,
          accountId: alice.accountId,
          direction: "expense",
          amountMinor: 100,
          occurredOn: "2026-11-08",
          name: "Cross",
          categoryId: bob.categoryId,
        }),
    },
    {
      label: "transaction → another user's beneficiary",
      constraint: "transactions_beneficiary_fk",
      insert: (tx: Tx) =>
        tx.insert(transactions).values({
          userId: ALICE,
          accountId: alice.accountId,
          direction: "expense",
          amountMinor: 100,
          occurredOn: "2026-11-08",
          name: "Cross",
          beneficiaryId: bob.beneficiaryId,
        }),
    },
    {
      label: "category → another user's group",
      constraint: "categories_group_fk",
      insert: (tx: Tx) =>
        tx
          .insert(categories)
          .values({ userId: ALICE, groupId: bob.groupId, direction: "expense", name: "Cross" }),
    },
    {
      label: "transaction tag → another user's tag",
      constraint: "transaction_tags_tag_fk",
      insert: (tx: Tx) =>
        tx
          .insert(transactionTags)
          .values({ userId: ALICE, transactionId: alice.transactionId, tagId: bob.tagId }),
    },
    {
      label: "transaction tag → another user's transaction",
      constraint: "transaction_tags_transaction_fk",
      insert: (tx: Tx) =>
        tx
          .insert(transactionTags)
          .values({ userId: ALICE, transactionId: bob.transactionId, tagId: alice.tagId }),
    },
  ])("rejects $label", async ({ constraint, insert }) => {
    const error = await pgError(
      withUser(db.app, ALICE, async (tx) => {
        await insert(tx);
      }),
    );
    expect(error).toEqual({ code: "23503", constraint });
  });
});
