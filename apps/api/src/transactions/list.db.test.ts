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
let joint: string;
let children: string;
const ids: Record<string, string> = {};

// A fixed ledger, written once; every case filters it.
beforeAll(async () => {
  api = await createTestApi();
  alice = await signUpSeeded(api);
  const bob = await signUpSeeded(api);
  joint = (await alice.client.accounts.create({ name: "Joint", shareBps: 5000 })).id;
  children = (await alice.client.beneficiaries.create({ name: "Children" })).id;
  const rows: Array<
    { key: string } & Omit<
      Parameters<SeededUser["client"]["transactions"]["create"]>[0],
      "amountMinor" | "accountId" | "idempotencyKey"
    > & { accountId?: string }
  > = [
    {
      key: "groceries",
      direction: "expense",
      occurredOn: "2026-10-03",
      name: "Supermarket",
      categoryId: alice.categoryId("groceries"),
    },
    {
      key: "school",
      direction: "expense",
      occurredOn: "2026-10-15",
      name: "School trip",
      categoryId: alice.categoryId("outings"),
      beneficiaryId: children,
      note: "Field trip 50%",
    },
    {
      key: "ferry",
      direction: "expense",
      occurredOn: "2026-11-02",
      name: "Ferry",
      accountId: joint,
      tags: ["Summer trip"],
    },
    {
      key: "salary",
      direction: "income",
      occurredOn: "2026-11-01",
      name: "Salary",
      categoryId: alice.categoryId("salary"),
    },
    { key: "deleted", direction: "expense", occurredOn: "2026-11-05", name: "Deleted Supermarket" },
  ];
  for (const row of rows) {
    const { key, ...fields } = row;
    const created = await alice.client.transactions.create({
      amountMinor: 1000,
      accountId: alice.accountId,
      idempotencyKey: newKey(),
      ...fields,
    });
    ids[key] = created.id;
  }
  await alice.client.transactions.delete({ id: ids["deleted"] ?? "" });
  // Noise owned by someone else, matching every filter by name.
  await bob.client.transactions.create({
    direction: "expense",
    amountMinor: 1000,
    occurredOn: "2026-11-02",
    name: "Supermarket Ferry Salary",
    accountId: bob.accountId,
    idempotencyKey: newKey(),
  });
});

afterAll(async () => {
  await api.close();
});

type Filters = Parameters<SeededUser["client"]["transactions"]["list"]>[0];

describe("transactions.list filters", () => {
  it.each<{ label: string; filters: () => Filters; expected: string[] }>([
    {
      label: "no filter (newest first, deleted left out)",
      filters: () => ({}),
      expected: ["ferry", "salary", "school", "groceries"],
    },
    {
      label: "period",
      filters: () => ({ from: "2026-10-10", to: "2026-11-01" }),
      expected: ["salary", "school"],
    },
    { label: "account", filters: () => ({ accountId: joint }), expected: ["ferry"] },
    {
      label: "category",
      filters: () => ({ categoryId: alice.categoryId("groceries") }),
      expected: ["groceries"],
    },
    {
      label: "category group",
      filters: () => ({ groupId: alice.groupId("leisure") }),
      expected: ["school"],
    },
    { label: "beneficiary", filters: () => ({ beneficiaryId: children }), expected: ["school"] },
    {
      label: "tag, case-insensitive",
      filters: () => ({ tag: "summer trip" }),
      expected: ["ferry"],
    },
    { label: "direction", filters: () => ({ direction: "income" }), expected: ["salary"] },
    {
      label: "text in the name",
      filters: () => ({ text: "supermarket" }),
      expected: ["groceries"],
    },
    {
      label: "text in the note, % taken literally",
      filters: () => ({ text: "50%" }),
      expected: ["school"],
    },
    {
      label: "combined",
      filters: () => ({ direction: "expense", from: "2026-10-10" }),
      expected: ["ferry", "school"],
    },
  ])("filters by $label", async ({ filters, expected }) => {
    const { items } = await alice.client.transactions.list(filters());

    expect(items.map((t) => t.id)).toEqual(expected.map((key) => ids[key]));
  });
});

describe("transactions.list pagination", () => {
  it("walks every transaction once, page by page", async () => {
    const seen: string[] = [];
    let cursor: string | undefined;
    for (;;) {
      const page = await alice.client.transactions.list({
        limit: 3,
        ...(cursor ? { cursor } : {}),
      });
      seen.push(...page.items.map((t) => t.id));
      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }

    expect(seen).toEqual(["ferry", "salary", "school", "groceries"].map((key) => ids[key]));
  });

  it("refuses a cursor it did not produce", async () => {
    expect(await errorCode(alice.client.transactions.list({ cursor: "not-a-cursor" }))).toBe(
      "INVALID_CURSOR",
    );
  });
});
