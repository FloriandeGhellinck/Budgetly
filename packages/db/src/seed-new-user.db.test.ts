import { asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accounts, beneficiaries, categories, categoryGroups } from "./schema";
import { seedNewUser } from "./seed-new-user";
import { ALICE, createMigratedDatabase, type MigratedDatabase } from "./test-support";
import { withUser } from "./with-user";

let db: MigratedDatabase;

beforeAll(async () => {
  db = await createMigratedDatabase();
  // As the API will: as the new user, through RLS. Twice, as a retried sign-up.
  await withUser(db.app, ALICE, (tx) => seedNewUser(tx, ALICE));
  await withUser(db.app, ALICE, (tx) => seedNewUser(tx, ALICE));
});

afterAll(async () => {
  await db.close();
});

describe("seedNewUser", () => {
  it("creates one personal account", async () => {
    const rows = await db.admin
      .select({
        name: accounts.name,
        seedKey: accounts.seedKey,
        shareBps: accounts.shareBps,
        currency: accounts.currency,
      })
      .from(accounts)
      .where(eq(accounts.userId, ALICE));
    expect(rows).toEqual([{ name: "Main", seedKey: "main", shareBps: 10000, currency: "EUR" }]);
  });

  it("creates the beneficiary Me", async () => {
    const rows = await db.admin
      .select({ seedKey: beneficiaries.seedKey })
      .from(beneficiaries)
      .where(eq(beneficiaries.userId, ALICE));
    expect(rows).toEqual([{ seedKey: "me" }]);
  });

  it("creates the default groups with their kind and direction", async () => {
    const rows = await db.admin
      .select({
        seedKey: categoryGroups.seedKey,
        direction: categoryGroups.direction,
        kind: categoryGroups.kind,
      })
      .from(categoryGroups)
      .where(eq(categoryGroups.userId, ALICE))
      .orderBy(asc(categoryGroups.sortOrder));
    expect(rows).toEqual([
      { seedKey: "daily_life", direction: "expense", kind: "spending" },
      { seedKey: "leisure", direction: "expense", kind: "spending" },
      { seedKey: "investment", direction: "expense", kind: "saving" },
      { seedKey: "debt", direction: "expense", kind: "spending" },
      { seedKey: "income", direction: "income", kind: null },
    ]);
  });

  it("files the income categories under the income group", async () => {
    const rows = await db.admin
      .select({ seedKey: categories.seedKey })
      .from(categories)
      .innerJoin(categoryGroups, eq(categories.groupId, categoryGroups.id))
      .where(eq(categoryGroups.seedKey, "income"))
      .orderBy(asc(categories.sortOrder));
    expect(rows.map((row) => row.seedKey)).toEqual(["salary", "meal_vouchers", "other_income"]);
  });

  it("gives each default group a colour and an icon, and categories an icon only", async () => {
    const groups = await db.admin
      .select({
        seedKey: categoryGroups.seedKey,
        color: categoryGroups.color,
        icon: categoryGroups.icon,
      })
      .from(categoryGroups)
      .where(eq(categoryGroups.userId, ALICE))
      .orderBy(asc(categoryGroups.sortOrder));
    expect(groups.map((g) => [g.seedKey, g.color, g.icon])).toEqual([
      ["daily_life", "teal", "house"],
      ["leisure", "orange", "party-popper"],
      ["investment", "violet", "piggy-bank"],
      ["debt", "slate", "landmark"],
      ["income", "green", "wallet"],
    ]);
    const rows = await db.admin
      .select({ seedKey: categories.seedKey, color: categories.color, icon: categories.icon })
      .from(categories)
      .where(eq(categories.userId, ALICE));
    // Null colour: a default category wears its group's colour.
    expect(rows.every((row) => row.color === null && row.icon !== null)).toBe(true);
    expect(rows.find((row) => row.seedKey === "groceries")?.icon).toBe("shopping-cart");
  });
});
