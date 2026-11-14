import { accounts } from "@budgetly/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createTestApi,
  errorCode,
  newKey,
  signUpSeeded,
  type Client,
  type SeededUser,
  type TestApi,
} from "../test-support.ts";

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
    expect(
      (await carol.accounts.update({ id: main.id, name: "Joint account" })).seedKey,
    ).toBeNull();
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
    {
      label: "set the balance of",
      call: (id: string) => bob.accounts.setBalance({ id, balanceMinor: 1, asOf: "2026-11-01" }),
    },
  ])("cannot $label them: NOT_FOUND, row unchanged", async ({ call }) => {
    const account = await alice.accounts.create({ name: "Alice's" });
    const before = await storedAccount(account.id);

    expect(await errorCode(call(account.id))).toBe("NOT_FOUND");
    expect(await storedAccount(account.id)).toEqual(before);
  });
});

describe("accounts.setBalance", () => {
  let user: SeededUser;

  beforeAll(async () => {
    user = await signUpSeeded(api);
  });

  function record(
    accountId: string,
    entry: { direction?: "expense" | "income"; amountMinor: number; occurredOn: string },
  ) {
    return user.client.transactions.create({
      direction: "expense",
      name: "Entry",
      accountId,
      idempotencyKey: newKey(),
      ...entry,
    });
  }

  function transfer(from: string, to: string, amount: number, on: string) {
    return user.client.transfers.create({
      fromAccountId: from,
      toAccountId: to,
      sentAmountMinor: amount,
      occurredOn: on,
      idempotencyKey: newKey(),
    });
  }

  async function listed(id: string) {
    const { items } = await user.client.accounts.list({ includeArchived: true });
    return items.find((a) => a.id === id);
  }

  it("leaves an account without one relative", async () => {
    const account = await user.client.accounts.create({ name: "Untouched" });
    await record(account.id, { direction: "income", amountMinor: 5000, occurredOn: "2026-10-01" });

    expect(await listed(account.id)).toMatchObject({
      openingBalanceMinor: null,
      openingBalanceOn: null,
      balanceMinor: 5000,
    });
  });

  it("stores the opening balance that makes the bank's figure true on that day", async () => {
    const account = await user.client.accounts.create({ name: "Checking" });
    const other = await user.client.accounts.create({ name: "Other" });
    await record(account.id, {
      direction: "income",
      amountMinor: 300000,
      occurredOn: "2026-10-01",
    });
    await record(account.id, { amountMinor: 45000, occurredOn: "2026-10-05" });
    await transfer(account.id, other.id, 20000, "2026-10-10");
    await transfer(other.id, account.id, 5000, "2026-10-12");
    const deleted = await record(account.id, { amountMinor: 99900, occurredOn: "2026-10-13" });
    await user.client.transactions.delete({ id: deleted.id });
    // Dated after the bank's figure: it moves the balance on top of it.
    await record(account.id, { amountMinor: 1000, occurredOn: "2026-10-20" });

    // Net up to 2026-10-15: 3,000 − 450 − 200 + 50 = 2,400 €; the bank says 2,500 €.
    const result = await user.client.accounts.setBalance({
      id: account.id,
      balanceMinor: 250000,
      asOf: "2026-10-15",
    });

    expect(result).toMatchObject({
      openingBalanceMinor: 10000,
      openingBalanceOn: "2026-10-15",
      balanceMinor: 249000,
    });
    expect(await listed(account.id)).toMatchObject({ balanceMinor: 249000 });
    const report = await user.client.reports.accounts({ asOf: "2026-10-15" });
    expect(report.accounts.find((a) => a.accountId === account.id)).toMatchObject({
      balanceMinor: 250000,
      openingBalanceMinor: 10000,
      openingBalanceOn: "2026-10-15",
    });
  });

  it("counts a transaction entered later on the same day, and recomputes when set again", async () => {
    const account = await user.client.accounts.create({ name: "Daily" });
    await user.client.accounts.setBalance({
      id: account.id,
      balanceMinor: 10000,
      asOf: "2026-11-01",
    });

    await record(account.id, { amountMinor: 1500, occurredOn: "2026-11-01" });
    expect((await listed(account.id))?.balanceMinor).toBe(8500);

    const again = await user.client.accounts.setBalance({
      id: account.id,
      balanceMinor: 10000,
      asOf: "2026-11-01",
    });
    expect(again).toMatchObject({ openingBalanceMinor: 11500, balanceMinor: 10000 });
  });

  it("moves away from the bank's figure when a transaction is back-dated, until set again", async () => {
    const account = await user.client.accounts.create({ name: "Back-dated" });
    await user.client.accounts.setBalance({
      id: account.id,
      balanceMinor: 50000,
      asOf: "2026-11-05",
    });

    await record(account.id, { amountMinor: 2000, occurredOn: "2026-11-02" });
    expect((await listed(account.id))?.balanceMinor).toBe(48000);

    await user.client.accounts.setBalance({
      id: account.id,
      balanceMinor: 50000,
      asOf: "2026-11-05",
    });
    expect((await listed(account.id))?.balanceMinor).toBe(50000);
  });

  it("accepts an overdraft", async () => {
    const account = await user.client.accounts.create({ name: "Overdrawn" });
    await record(account.id, { direction: "income", amountMinor: 2000, occurredOn: "2026-09-01" });

    const result = await user.client.accounts.setBalance({
      id: account.id,
      balanceMinor: -12550,
      asOf: "2026-09-30",
    });

    expect(result).toMatchObject({ openingBalanceMinor: -14550, balanceMinor: -12550 });
  });

  it("uses the full balance of a shared account, not the caller's share", async () => {
    const joint = await user.client.accounts.create({ name: "Joint", shareBps: 5000 });
    await record(joint.id, { amountMinor: 8000, occurredOn: "2026-08-02" });

    const result = await user.client.accounts.setBalance({
      id: joint.id,
      balanceMinor: 100000,
      asOf: "2026-08-31",
    });

    expect(result).toMatchObject({ openingBalanceMinor: 108000, balanceMinor: 100000 });
  });

  it("never reaches the reports' figures", async () => {
    const reporter = await signUpSeeded(api);
    await reporter.client.transactions.create({
      direction: "expense",
      name: "Groceries",
      amountMinor: 4200,
      occurredOn: "2026-07-03",
      accountId: reporter.accountId,
      categoryId: reporter.categoryId("groceries"),
      idempotencyKey: newKey(),
    });
    const before = await reporter.client.reports.monthOverview({ month: "2026-07" });

    await reporter.client.accounts.setBalance({
      id: reporter.accountId,
      balanceMinor: 500000,
      asOf: "2026-07-01",
    });

    expect(await reporter.client.reports.monthOverview({ month: "2026-07" })).toEqual(before);
  });

  it("refuses an unknown account: NOT_FOUND", async () => {
    expect(
      await errorCode(
        user.client.accounts.setBalance({
          id: "3f6c1d2e-8a4b-4c1e-9f0a-1b2c3d4e5f60",
          balanceMinor: 0,
          asOf: "2026-11-01",
        }),
      ),
    ).toBe("NOT_FOUND");
  });

  it("is not visible to another user", async () => {
    const account = await user.client.accounts.create({ name: "Private balance" });
    await user.client.accounts.setBalance({
      id: account.id,
      balanceMinor: 7700,
      asOf: "2026-11-01",
    });

    const other = await bob.reports.accounts({});

    expect(other.accounts.map((a) => a.accountId)).not.toContain(account.id);
    expect(
      (await bob.accounts.list({ includeArchived: true })).items.map((a) => a.id),
    ).not.toContain(account.id);
  });
});
