// Shared by the *.db.test.ts files; not exported from the package.
import { appRoleUrl, createTestDatabase, migrate } from "@expense/test-db";
import { createDb, type Db } from "./client";
import {
  accounts,
  beneficiaries,
  categories,
  categoryGroups,
  tags,
  transactions,
  transactionTags,
} from "./schema";

export const ALICE = "00000000-0000-0000-0000-00000000a11c";
export const BOB = "00000000-0000-0000-0000-00000000b0b0";

export type MigratedDatabase = {
  // Superuser: bypasses RLS, for fixtures and for reading the truth.
  admin: Db;
  // Logged in as app_runtime, like apps/api: RLS applies.
  app: Db;
  close(): Promise<void>;
};

export async function createMigratedDatabase(): Promise<MigratedDatabase> {
  const database = await createTestDatabase();
  await migrate(database.sql);
  await database.sql`insert into auth.users (id) values (${ALICE}), (${BOB})`;
  const admin = createDb(database.url);
  const app = createDb(appRoleUrl(database.url));
  return {
    admin,
    app,
    async close() {
      await Promise.all([admin.$client.end(), app.$client.end()]);
      await database.close();
    },
  };
}

export type OwnedRows = {
  accountId: string;
  groupId: string;
  categoryId: string;
  beneficiaryId: string;
  tagId: string;
  transactionId: string;
};

// One row in every table, owned by `userId`, written as the superuser.
export async function insertOwnedRows(db: Db, userId: string): Promise<OwnedRows> {
  const [account] = await db
    .insert(accounts)
    .values({ userId, name: "Joint", shareBps: 5000 })
    .returning();
  const [group] = await db
    .insert(categoryGroups)
    .values({ userId, name: "Daily life", direction: "expense", kind: "spending" })
    .returning();
  if (!account || !group) throw new Error("fixture insert returned no row");
  const [category] = await db
    .insert(categories)
    .values({ userId, groupId: group.id, direction: "expense", name: "Groceries" })
    .returning();
  const [beneficiary] = await db.insert(beneficiaries).values({ userId, name: "Me" }).returning();
  const [tag] = await db.insert(tags).values({ userId, name: "Holiday" }).returning();
  if (!category || !beneficiary || !tag) throw new Error("fixture insert returned no row");
  const [transaction] = await db
    .insert(transactions)
    .values({
      userId,
      accountId: account.id,
      direction: "expense",
      amountMinor: 2068,
      occurredOn: "2026-11-08",
      name: "Supermarket",
      categoryId: category.id,
      beneficiaryId: beneficiary.id,
    })
    .returning();
  if (!transaction) throw new Error("fixture insert returned no row");
  await db.insert(transactionTags).values({ userId, transactionId: transaction.id, tagId: tag.id });
  return {
    accountId: account.id,
    groupId: group.id,
    categoryId: category.id,
    beneficiaryId: beneficiary.id,
    tagId: tag.id,
    transactionId: transaction.id,
  };
}
