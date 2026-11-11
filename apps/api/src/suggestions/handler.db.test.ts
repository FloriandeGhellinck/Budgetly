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

function record(user: SeededUser, name: string, categoryKey: string) {
  return user.client.transactions.create({
    direction: "expense",
    amountMinor: 1000,
    occurredOn: "2026-11-01",
    name,
    accountId: user.accountId,
    categoryId: user.categoryId(categoryKey),
    idempotencyKey: newKey(),
  });
}

describe("suggestions.forName", () => {
  it("suggests from the caller's live transactions with a similar name", async () => {
    await record(alice, "Supermarket Central", "groceries");
    const deleted = await record(alice, "Supermarket", "health");
    await alice.client.transactions.delete({ id: deleted.id });
    await record(alice, "Pharmacy", "health");

    const { suggestions } = await alice.client.suggestions.forName({ name: "supermarket" });

    expect(suggestions.map((s) => s.categoryId)).toEqual([alice.categoryId("groceries")]);
    expect(suggestions[0]).toMatchObject({
      accountId: alice.accountId,
      direction: "expense",
      occurrences: 1,
    });
  });

  it("never draws on another user's history", async () => {
    await record(alice, "Grocer", "groceries");

    const { suggestions } = await bob.client.suggestions.forName({ name: "Grocer" });

    expect(suggestions).toEqual([]);
  });
});
