import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createTestApi,
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

function expenseTagged(user: SeededUser, tags: string[]) {
  return user.client.transactions.create({
    direction: "expense",
    amountMinor: 1000,
    occurredOn: "2026-09-12",
    name: "Ferry",
    accountId: user.accountId,
    tags,
    idempotencyKey: newKey(),
  });
}

describe("tags.list", () => {
  it("lists tags created by transaction writes once, whatever their casing", async () => {
    await expenseTagged(alice, ["Summer trip", "Holiday"]);
    const second = await expenseTagged(alice, ["holiday"]);

    const { items } = await alice.client.tags.list({});

    expect(items.map((t) => t.name)).toEqual(["Holiday", "Summer trip"]);
    expect(second.tags).toEqual(["Holiday"]);
  });

  it("never shows another user's tags", async () => {
    await expenseTagged(alice, ["Alice only"]);

    const { items } = await bob.client.tags.list({});

    expect(items).toEqual([]);
  });
});
