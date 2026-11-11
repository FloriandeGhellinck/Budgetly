import { categories, categoryGroups } from "@budgetly/db";
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

async function storedGroup(id: string) {
  const [row] = await api.admin.select().from(categoryGroups).where(eq(categoryGroups.id, id));
  return row;
}

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

  it("gives groups a colour and icon, and default categories an icon of their own", async () => {
    const { groups } = await alice.client.categories.list({});

    const daily = groups.find((g) => g.seedKey === "daily_life");
    expect(daily).toMatchObject({ color: "teal", icon: "house" });
    expect(daily?.categories.find((c) => c.seedKey === "groceries")).toMatchObject({
      color: null,
      icon: "shopping-cart",
    });
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

  it("inherits the group's look unless a colour or icon is given", async () => {
    const plain = await alice.client.categories.create({
      groupId: alice.groupId("leisure"),
      name: "Books",
    });
    const pets = await alice.client.categories.create({
      groupId: alice.groupId("daily_life"),
      name: "Pets",
      color: "amber",
      icon: "paw-print",
    });

    expect(plain).toMatchObject({ color: null, icon: null });
    expect(pets).toMatchObject({ color: "amber", icon: "paw-print" });
  });

  it("refuses an icon outside the allow-list", async () => {
    const code = await errorCode(
      alice.client.categories.create({
        groupId: alice.groupId("leisure"),
        name: "Odd",
        // @ts-expect-error: not an allowed icon
        icon: "skull",
      }),
    );

    expect(code).toBe("BAD_REQUEST");
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

  it("changes colour and icon without touching the seed key, and null goes back to the group's", async () => {
    const id = alice.categoryId("childcare");

    const styled = await alice.client.categories.update({ id, color: "pink", icon: "baby" });
    const reset = await alice.client.categories.update({ id, color: null });

    expect(styled).toMatchObject({ color: "pink", icon: "baby", seedKey: "childcare" });
    expect(reset).toMatchObject({ color: null, icon: "baby" });
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

describe("categories.updateGroup", () => {
  it("changes only the fields passed and returns the group with its categories", async () => {
    const id = alice.groupId("investment");

    const group = await alice.client.categories.updateGroup({ id, color: "blue" });

    expect(group).toMatchObject({ id, color: "blue", icon: "piggy-bank", seedKey: "investment" });
    expect(group.categories.map((c) => c.seedKey)).toEqual(["stocks", "crypto", "real_estate"]);
  });

  it("refuses a colour outside the palette", async () => {
    const code = await errorCode(
      alice.client.categories.updateGroup({
        id: alice.groupId("leisure"),
        // @ts-expect-error: not a palette token
        color: "#ff0000",
      }),
    );

    expect(code).toBe("BAD_REQUEST");
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

  it("cannot restyle them: NOT_FOUND, rows unchanged", async () => {
    const categoryId = alice.categoryId("groceries");
    const groupId = alice.groupId("debt");
    const [categoryBefore, groupBefore] = [
      await storedCategory(categoryId),
      await storedGroup(groupId),
    ];

    expect(await errorCode(bob.client.categories.update({ id: categoryId, color: "red" }))).toBe(
      "NOT_FOUND",
    );
    expect(await errorCode(bob.client.categories.updateGroup({ id: groupId, icon: "gem" }))).toBe(
      "NOT_FOUND",
    );
    expect(await storedCategory(categoryId)).toEqual(categoryBefore);
    expect(await storedGroup(groupId)).toEqual(groupBefore);
  });
});
