import { accounts, beneficiaries, categories } from "@budgetly/db";
import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApi, type TestApi } from "../test-support.ts";

let api: TestApi;

beforeAll(async () => {
  api = await createTestApi();
});

afterAll(async () => {
  await api.close();
});

async function rowCounts(userId: string) {
  const [account] = await api.admin
    .select({ n: count() })
    .from(accounts)
    .where(eq(accounts.userId, userId));
  const [beneficiary] = await api.admin
    .select({ n: count() })
    .from(beneficiaries)
    .where(eq(beneficiaries.userId, userId));
  const [category] = await api.admin
    .select({ n: count() })
    .from(categories)
    .where(eq(categories.userId, userId));
  return { accounts: account?.n, beneficiaries: beneficiary?.n, categories: category?.n };
}

describe("me.bootstrap", () => {
  it("creates the defaults once and changes nothing on later calls", async () => {
    const { userId, client } = await api.signUp();

    expect(await client.me.bootstrap({})).toEqual({ created: true });
    const afterFirst = await rowCounts(userId);
    expect(await client.me.bootstrap({})).toEqual({ created: false });

    expect(afterFirst.accounts).toBe(1);
    expect(afterFirst.beneficiaries).toBe(1);
    expect(await rowCounts(userId)).toEqual(afterFirst);
  });

  it("survives concurrent first calls with one set of defaults", async () => {
    const { userId, client } = await api.signUp();

    const results = await Promise.all([client.me.bootstrap({}), client.me.bootstrap({})]);

    expect(results.filter((result) => result.created)).toHaveLength(1);
    expect((await rowCounts(userId)).accounts).toBe(1);
  });

  it("seeds only the caller's space", async () => {
    const alice = await api.signUp();
    const bob = await api.signUp();

    await alice.client.me.bootstrap({});

    expect(await rowCounts(bob.userId)).toEqual({ accounts: 0, beneficiaries: 0, categories: 0 });
  });
});
