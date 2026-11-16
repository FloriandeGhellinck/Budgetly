import { AnalysisView } from "@budgetly/contract";
import { savedViews } from "@budgetly/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createTestApi,
  errorCode,
  signUpSeeded,
  type SeededUser,
  type TestApi,
} from "../test-support.ts";

let api: TestApi;
let alice: SeededUser;
let bob: SeededUser;

const defaults = AnalysisView.parse({});

beforeAll(async () => {
  api = await createTestApi();
  [alice, bob] = await Promise.all([signUpSeeded(api), signUpSeeded(api)]);
});

afterAll(async () => {
  await api.close();
});

async function stored(id: string) {
  const [row] = await api.admin.select().from(savedViews).where(eq(savedViews.id, id));
  return row;
}

describe("savedViews.list", () => {
  it("starts a new user with the three starter views, in tab order", async () => {
    const { items } = await alice.client.savedViews.list({});

    expect(items.map((v) => [v.seedKey, v.name, v.view.groupBy, v.view.types])).toEqual([
      ["this_month", "This month", "group", ["spending", "saving"]],
      ["spending_per_month", "Spending per month", "month", ["spending"]],
      ["income_per_month", "Income per month", "month", ["income"]],
    ]);
    expect(items[1]?.view).toEqual({
      ...defaults,
      types: ["spending"],
      period: { kind: "relative", preset: "last-12-months" },
      groupBy: "month",
      display: "bars",
      compare: "last-year",
    });
  });

  it("reads a stored view leniently: a field that no longer parses takes its default", async () => {
    const view = await bob.client.savedViews.create({ name: "Old", view: { types: ["income"] } });
    await api.admin
      .update(savedViews)
      .set({ view: { types: ["income"], groupBy: "weather", period: "someday" } })
      .where(eq(savedViews.id, view.id));

    const { items } = await bob.client.savedViews.list({});

    expect(items.find((v) => v.id === view.id)?.view).toEqual({ ...defaults, types: ["income"] });
  });
});

describe("savedViews.create", () => {
  it("adds a view as the last tab, defaults filled in", async () => {
    const created = await alice.client.savedViews.create({
      name: "Groceries",
      view: { categoryIds: [alice.categoryId("groceries")], groupBy: "month" },
    });

    expect(created).toMatchObject({
      name: "Groceries",
      seedKey: null,
      view: { ...defaults, categoryIds: [alice.categoryId("groceries")], groupBy: "month" },
    });
    const { items } = await alice.client.savedViews.list({});
    expect(items.at(-1)?.id).toBe(created.id);
  });

  it.each([
    { label: "an unknown type", input: { name: "Bad", view: { types: ["refunds"] } } },
    { label: "a blank name", input: { name: "  ", view: {} } },
    {
      label: "fixed dates in the wrong order",
      input: {
        name: "Bad",
        view: { period: { kind: "fixed", from: "2026-11-30", to: "2026-11-01" } },
      },
    },
  ])("refuses $label: BAD_REQUEST", async ({ input }) => {
    // @ts-expect-error: invalid on purpose
    expect(await errorCode(alice.client.savedViews.create(input))).toBe("BAD_REQUEST");
  });
});

describe("savedViews.update", () => {
  it("renames a starter view and clears its seed key; the same name keeps it", async () => {
    const { items } = await alice.client.savedViews.list({});
    const [first, second] = items;

    const same = await alice.client.savedViews.update({ id: second?.id ?? "", name: second?.name });
    const renamed = await alice.client.savedViews.update({ id: first?.id ?? "", name: "Now" });

    expect(same.seedKey).toBe("spending_per_month");
    expect(renamed).toMatchObject({ name: "Now", seedKey: null, view: first?.view });
  });

  it("replaces the view whole and keeps the name", async () => {
    const created = await alice.client.savedViews.create({
      name: "Mine",
      view: { text: "bakery" },
    });

    const updated = await alice.client.savedViews.update({
      id: created.id,
      view: { types: ["income"] },
    });

    expect(updated).toMatchObject({ name: "Mine", view: { ...defaults, types: ["income"] } });
  });
});

describe("savedViews.delete", () => {
  it("deletes a starter view for good, even if bootstrap runs again", async () => {
    const { items } = await alice.client.savedViews.list({});
    const income = items.find((v) => v.seedKey === "income_per_month");

    await alice.client.savedViews.delete({ id: income?.id ?? "" });
    await alice.client.me.bootstrap({});

    const after = await alice.client.savedViews.list({});
    expect(after.items.map((v) => v.seedKey)).not.toContain("income_per_month");
    expect(await errorCode(alice.client.savedViews.delete({ id: income?.id ?? "" }))).toBe(
      "NOT_FOUND",
    );
  });
});

describe("another user's saved views", () => {
  it("are absent from the list and cannot be renamed, replaced or deleted", async () => {
    const view = await alice.client.savedViews.create({ name: "Private", view: {} });

    const { items } = await bob.client.savedViews.list({});
    expect(items.map((v) => v.id)).not.toContain(view.id);
    expect(await errorCode(bob.client.savedViews.update({ id: view.id, name: "Mine now" }))).toBe(
      "NOT_FOUND",
    );
    expect(await errorCode(bob.client.savedViews.update({ id: view.id, view: {} }))).toBe(
      "NOT_FOUND",
    );
    expect(await errorCode(bob.client.savedViews.delete({ id: view.id }))).toBe("NOT_FOUND");
    expect(await stored(view.id)).toMatchObject({ userId: alice.userId, name: "Private" });
  });
});
