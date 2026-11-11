import { categories } from "@budgetly/db";
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

async function storedCategory(id: string) {
  const [row] = await api.admin.select().from(categories).where(eq(categories.id, id));
  return row;
}

describe("categories.list", () => {
  it("returns the default groups with their categories and seed keys", async () => {
    const { groups } = await alice.client.categories.list({});

    const income = groups.find((g) => g.seedKey === "income");
    expect(groups.map((g) => g.seedKey)).toEqual([
      "daily_life",
      "leisure",
      "investment",
      "debt",
      "income",
    ]);
    expect(income).toMatchObject({ direction: "income", kind: null });
    expect(income?.categories.map((c) => c.seedKey)).toEqual([
      "salary",
      "meal_vouchers",
      "other_income",
    ]);
  });
});

describe("categories.create", () => {
  it("files the category under the group with the group's direction, after its siblings", async () => {
    const category = await alice.client.categories.create({
      groupId: alice.groupId("income"),
      name: "Bonus",
    });

    expect(category).toMatchObject({ direction: "income", seedKey: null, sortOrder: 3 });
  });
});

describe("categories.update", () => {
  it("clears the seed key of a renamed default", async () => {
    const id = alice.categoryId("health");

    const renamed = await alice.client.categories.update({ id, name: "Doctor" });

    expect(renamed).toMatchObject({ name: "Doctor", seedKey: null });
  });

  it("keeps the seed key when the name does not change", async () => {
    const id = alice.categoryId("clothing");

    const same = await alice.client.categories.update({ id, name: "Clothing" });

    expect(same.seedKey).toBe("clothing");
  });

  it("moves a category to another group of its direction", async () => {
    const id = alice.categoryId("sport");

    const moved = await alice.client.categories.update({
      id,
      groupId: alice.groupId("daily_life"),
    });

    expect(moved.groupId).toBe(alice.groupId("daily_life"));
  });

  it("refuses a group of the other direction", async () => {
    const id = alice.categoryId("gifts");

    const code = await errorCode(
      alice.client.categories.update({ id, groupId: alice.groupId("income") }),
    );

    expect(code).toBe("CATEGORY_DIRECTION_MISMATCH");
  });
});

describe("categories.delete", () => {
  it("deletes an unused category", async () => {
    const category = await alice.client.categories.create({
      groupId: alice.groupId("leisure"),
      name: "Lottery",
    });

    await alice.client.categories.delete({ id: category.id });

    expect(await storedCategory(category.id)).toBeUndefined();
  });

  it("refuses a category a deleted transaction still uses", async () => {
    const category = await alice.client.categories.create({
      groupId: alice.groupId("leisure"),
      name: "Cinema",
    });
    const transaction = await alice.client.transactions.create({
      direction: "expense",
      amountMinor: 1200,
      occurredOn: "2026-11-08",
      name: "Movie",
      accountId: alice.accountId,
      categoryId: category.id,
      idempotencyKey: newKey(),
    });
    await alice.client.transactions.delete({ id: transaction.id });

    expect(await errorCode(alice.client.categories.delete({ id: category.id }))).toBe(
      "CATEGORY_IN_USE",
    );
    expect(await storedCategory(category.id)).toBeDefined();
  });
});

describe("categories: another user", () => {
  it("does not see them", async () => {
    const { groups } = await bob.client.categories.list({});

    const ids = groups.flatMap((g) => [g.id, ...g.categories.map((c) => c.id)]);
    expect(ids).not.toContain(alice.categoryId("groceries"));
    expect(ids).not.toContain(alice.groupId("daily_life"));
  });

  it("cannot create a category in their group", async () => {
    const code = await errorCode(
      bob.client.categories.create({ groupId: alice.groupId("debt"), name: "Spy" }),
    );

    expect(code).toBe("NOT_FOUND");
  });

  it.each([
    { label: "rename", call: (id: string) => bob.client.categories.update({ id, name: "Spy" }) },
    { label: "delete", call: (id: string) => bob.client.categories.delete({ id }) },
  ])("cannot $label them: NOT_FOUND, row unchanged", async ({ call }) => {
    const id = alice.categoryId("furniture");
    const before = await storedCategory(id);

    expect(await errorCode(call(id))).toBe("NOT_FOUND");
    expect(await storedCategory(id)).toEqual(before);
  });
});
