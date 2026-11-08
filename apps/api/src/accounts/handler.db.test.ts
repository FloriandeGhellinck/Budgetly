import { accounts } from "@expense/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApi, errorCode, type Client, type TestApi } from "../test-support.ts";

let api: TestApi;
let alice: Client;
let bob: Client;

beforeAll(async () => {
  api = await createTestApi();
  alice = (await api.signUp()).client;
  bob = (await api.signUp()).client;
});

afterAll(async () => {
  await api.close();
});

async function storedAccount(id: string) {
  const [row] = await api.admin.select().from(accounts).where(eq(accounts.id, id));
  return row;
}

describe("accounts", () => {
  it("creates a personal account by default and a joint one with its share", async () => {
    const personal = await alice.accounts.create({ name: "Broker" });
    const joint = await alice.accounts.create({ name: "Joint account", shareBps: 5000 });

    expect(personal).toMatchObject({ name: "Broker", currency: "EUR", shareBps: 10000 });
    expect(joint.shareBps).toBe(5000);
    expect((await storedAccount(joint.id))?.shareBps).toBe(5000);
  });

  it("updates only the fields passed", async () => {
    const account = await alice.accounts.create({ name: "Card", currency: "EURC" });

    const updated = await alice.accounts.update({ id: account.id, shareBps: 2500 });

    expect(updated).toMatchObject({ name: "Card", currency: "EURC", shareBps: 2500 });
  });

  it("clears the seed key of the default account when it is renamed", async () => {
    const carol = (await api.signUp()).client;
    await carol.me.bootstrap({});
    const [main] = (await carol.accounts.list({})).items;
    if (!main) throw new Error("bootstrap created no account");
    expect(main.seedKey).toBe("main");

    expect((await carol.accounts.update({ id: main.id, name: main.name })).seedKey).toBe("main");
    expect((await carol.accounts.update({ id: main.id, name: "Joint account" })).seedKey).toBeNull();
  });

  it("hides archived accounts from the default list and brings them back", async () => {
    const account = await alice.accounts.create({ name: "Old card" });

    await alice.accounts.archive({ id: account.id });
    const active = await alice.accounts.list({});
    const all = await alice.accounts.list({ includeArchived: true });
    await alice.accounts.unarchive({ id: account.id });

    expect(active.items.map((a) => a.id)).not.toContain(account.id);
    expect(all.items.find((a) => a.id === account.id)?.archivedAt).not.toBeNull();
    expect((await alice.accounts.list({})).items.map((a) => a.id)).toContain(account.id);
  });

  it("keeps the first archive date when archived twice", async () => {
    const account = await alice.accounts.create({ name: "Twice" });

    const first = await alice.accounts.archive({ id: account.id });
    const second = await alice.accounts.archive({ id: account.id });

    expect(second.archivedAt).toBe(first.archivedAt);
  });
});

describe("accounts: another user", () => {
  it("does not see them in the list", async () => {
    const account = await alice.accounts.create({ name: "Alice only" });

    const list = await bob.accounts.list({ includeArchived: true });

    expect(list.items.map((a) => a.id)).not.toContain(account.id);
  });

  it.each([
    { label: "update", call: (id: string) => bob.accounts.update({ id, name: "Mine now" }) },
    { label: "archive", call: (id: string) => bob.accounts.archive({ id }) },
    { label: "unarchive", call: (id: string) => bob.accounts.unarchive({ id }) },
  ])("cannot $label them: NOT_FOUND, row unchanged", async ({ call }) => {
    const account = await alice.accounts.create({ name: "Alice's" });
    const before = await storedAccount(account.id);

    expect(await errorCode(call(account.id))).toBe("NOT_FOUND");
    expect(await storedAccount(account.id)).toEqual(before);
  });
});
