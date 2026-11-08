import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createTestApi,
  errorCode,
  newKey,
  signUpSeeded,
  type SeededUser,
  type TestApi,
} from "../test-support.ts";

// Hand-made fixtures, one user per scenario, so every expected figure can be
// checked on paper. Amounts are cents.
let api: TestApi;
// ADR 0023: personal Main + joint account at 50 %, March 2026 (plus one
// April expense on Main for the tag).
let carol: SeededUser;
let joint: string;
let tripTagId: string;
// Personal accounts only, April–May 2026: spending vs saving, deletions, transfers.
let dave: SeededUser;
let daveSavings: string;
// Rounding on a 50 % account, June 2026.
let erin: SeededUser;
// Another user with data in the same months: must never show up above.
let bob: SeededUser;

type Entry = {
  direction?: "expense" | "income";
  amountMinor: number;
  occurredOn: string;
  accountId?: string;
  categoryId?: string;
  beneficiaryId?: string;
  tags?: string[];
};

function record(user: SeededUser, entry: Entry) {
  return user.client.transactions.create({
    direction: "expense",
    name: "Entry",
    accountId: user.accountId,
    idempotencyKey: newKey(),
    ...entry,
  });
}

function transfer(user: SeededUser, from: string, to: string, amount: number, on: string) {
  return user.client.transfers.create({
    fromAccountId: from,
    toAccountId: to,
    sentAmountMinor: amount,
    occurredOn: on,
    idempotencyKey: newKey(),
  });
}

beforeAll(async () => {
  api = await createTestApi();
  [carol, dave, erin, bob] = await Promise.all([
    signUpSeeded(api),
    signUpSeeded(api),
    signUpSeeded(api),
    signUpSeeded(api),
  ]);

  joint = (await carol.client.accounts.create({ name: "Joint", shareBps: 5000 })).id;
  await transfer(carol, carol.accountId, joint, 100000, "2026-03-01");
  await record(carol, {
    direction: "income",
    amountMinor: 100000,
    occurredOn: "2026-03-02",
    accountId: joint,
    categoryId: carol.categoryId("other_income"),
  });
  await record(carol, {
    amountMinor: 120000,
    occurredOn: "2026-03-03",
    accountId: joint,
    categoryId: carol.categoryId("groceries"),
  });
  await record(carol, {
    amountMinor: 60000,
    occurredOn: "2026-03-05",
    accountId: joint,
    categoryId: carol.categoryId("holidays"),
    tags: ["Trip"],
  });
  await record(carol, {
    amountMinor: 2000,
    occurredOn: "2026-04-07",
    categoryId: carol.categoryId("outings"),
    tags: ["trip"],
  });
  const deletedTripExpense = await record(carol, {
    amountMinor: 5000,
    occurredOn: "2026-03-09",
    categoryId: carol.categoryId("outings"),
    tags: ["Trip"],
  });
  await carol.client.transactions.delete({ id: deletedTripExpense.id });
  const tags = await carol.client.tags.list({});
  tripTagId = tags.items.find((t) => t.name === "Trip")?.id ?? "";

  daveSavings = (await dave.client.accounts.create({ name: "Savings" })).id;
  await record(dave, {
    direction: "income",
    amountMinor: 200000,
    occurredOn: "2026-04-01",
    categoryId: dave.categoryId("salary"),
  });
  await record(dave, {
    amountMinor: 40000,
    occurredOn: "2026-04-10",
    categoryId: dave.categoryId("groceries"),
  });
  await record(dave, {
    direction: "income",
    amountMinor: 300000,
    occurredOn: "2026-05-01",
    categoryId: dave.categoryId("salary"),
  });
  await record(dave, {
    amountMinor: 50000,
    occurredOn: "2026-05-10",
    categoryId: dave.categoryId("groceries"),
    beneficiaryId: dave.beneficiaryId,
  });
  await record(dave, {
    amountMinor: 75000,
    occurredOn: "2026-05-15",
    categoryId: dave.categoryId("stocks"),
  });
  await record(dave, { amountMinor: 1000, occurredOn: "2026-05-20" });
  const deleted = await record(dave, {
    amountMinor: 99999,
    occurredOn: "2026-05-21",
    categoryId: dave.categoryId("groceries"),
  });
  await dave.client.transactions.delete({ id: deleted.id });
  await transfer(dave, dave.accountId, daveSavings, 10000, "2026-05-25");
  const deletedTransfer = await transfer(dave, dave.accountId, daveSavings, 7000, "2026-05-26");
  await dave.client.transfers.delete({ transferId: deletedTransfer.transferId });
  await dave.client.accounts.archive({ id: daveSavings });

  const erinJoint = (await erin.client.accounts.create({ name: "Joint", shareBps: 5000 })).id;
  for (const amountMinor of [1, 1, 1, 3333]) {
    await record(erin, {
      amountMinor,
      occurredOn: "2026-06-10",
      accountId: erinJoint,
      categoryId: erin.categoryId("groceries"),
    });
  }

  await record(bob, {
    direction: "income",
    amountMinor: 777700,
    occurredOn: "2026-05-02",
    categoryId: bob.categoryId("salary"),
  });
  await record(bob, {
    amountMinor: 7700,
    occurredOn: "2026-05-03",
    categoryId: bob.categoryId("groceries"),
    tags: ["Trip"],
  });
});

afterAll(async () => {
  await api.close();
});

describe("reports.monthOverview", () => {
  it("counts the ADR 0023 month: half the joint expenses, no income from deposits", async () => {
    const { current } = await carol.client.reports.monthOverview({ month: "2026-03" });

    expect(current).toEqual({
      month: "2026-03",
      incomeMinor: 0,
      spendingMinor: 90000,
      savingMinor: 0,
      netMinor: -90000,
      savingsRateBps: null,
    });
  });

  it("splits saving from spending and compares with the previous month", async () => {
    const overview = await dave.client.reports.monthOverview({ month: "2026-05" });

    // 2026-05: salary 3,000 €, groceries 500 € + 10 € uncategorized, stocks 750 €;
    // the deleted expense and both transfers are left out.
    expect(overview).toEqual({
      current: {
        month: "2026-05",
        incomeMinor: 300000,
        spendingMinor: 51000,
        savingMinor: 75000,
        netMinor: 174000,
        savingsRateBps: 2500,
      },
      previous: {
        month: "2026-04",
        incomeMinor: 200000,
        spendingMinor: 40000,
        savingMinor: 0,
        netMinor: 160000,
        savingsRateBps: 0,
      },
      change: {
        incomeMinor: 100000,
        spendingMinor: 11000,
        savingMinor: 75000,
        netMinor: 14000,
        savingsRateBps: 2500,
      },
    });
  });

  it("rounds my part half up per transaction, then sums", async () => {
    const { current } = await erin.client.reports.monthOverview({ month: "2026-06" });

    // 1, 1, 1 and 3333 cents at 50 %: 1 + 1 + 1 + 1667. Rounding the sum
    // (3336 × 50 % = 1668) would differ.
    expect(current.spendingMinor).toBe(1670);
  });

  it("shows another user only their own figures", async () => {
    const { current } = await bob.client.reports.monthOverview({ month: "2026-05" });

    expect(current).toMatchObject({ incomeMinor: 777700, spendingMinor: 7700, savingMinor: 0 });
  });
});

describe("reports.trend", () => {
  it("lists every month in the range, empty ones as zeros", async () => {
    const { months } = await dave.client.reports.trend({ from: "2026-03", to: "2026-06" });

    expect(
      months.map((m) => [m.month, m.incomeMinor, m.spendingMinor, m.savingMinor, m.netMinor]),
    ).toEqual([
      ["2026-03", 0, 0, 0, 0],
      ["2026-04", 200000, 40000, 0, 160000],
      ["2026-05", 300000, 51000, 75000, 174000],
      ["2026-06", 0, 0, 0, 0],
    ]);
  });

  it.each([
    { label: "from after to", from: "2026-06", to: "2026-05" },
    { label: "more than 36 months", from: "2023-05", to: "2026-05" },
    { label: "a malformed month", from: "2026-13", to: "2026-12" },
  ])("refuses $label: BAD_REQUEST", async ({ from, to }) => {
    expect(await errorCode(dave.client.reports.trend({ from, to }))).toBe("BAD_REQUEST");
  });

  it("accepts exactly 36 months", async () => {
    const { months } = await dave.client.reports.trend({ from: "2023-06", to: "2026-05" });

    expect(months).toHaveLength(36);
  });
});

describe("reports.breakdown", () => {
  const may = { from: "2026-05-01", to: "2026-05-31" };

  it("totals expenses per group and category, largest first, with counts", async () => {
    const result = await dave.client.reports.breakdown(may);

    expect(result).toEqual({
      totalMinor: 126000,
      count: 3,
      groups: [
        {
          groupId: dave.groupId("investment"),
          name: "Investment",
          kind: "saving",
          totalMinor: 75000,
          count: 1,
          categories: [
            { categoryId: dave.categoryId("stocks"), name: "Stocks", totalMinor: 75000, count: 1 },
          ],
        },
        {
          groupId: dave.groupId("daily_life"),
          name: "Daily life",
          kind: "spending",
          totalMinor: 50000,
          count: 1,
          categories: [
            {
              categoryId: dave.categoryId("groceries"),
              name: "Groceries",
              totalMinor: 50000,
              count: 1,
            },
          ],
        },
        {
          groupId: null,
          name: null,
          kind: "spending",
          totalMinor: 1000,
          count: 1,
          categories: [{ categoryId: null, name: null, totalMinor: 1000, count: 1 }],
        },
      ],
    });
  });

  it("adds up to the month overview's spending plus saving", async () => {
    const [{ totalMinor }, { current }] = await Promise.all([
      carol.client.reports.breakdown({ from: "2026-03-01", to: "2026-03-31" }),
      carol.client.reports.monthOverview({ month: "2026-03" }),
    ]);

    expect(totalMinor).toBe(current.spendingMinor + current.savingMinor);
  });

  it.each([
    {
      label: "beneficiary",
      filter: () => ({ beneficiaryId: dave.beneficiaryId }),
      group: "daily_life",
    },
    {
      label: "group",
      filter: () => ({ groupId: dave.groupId("investment") }),
      group: "investment",
    },
  ])("filters by $label", async ({ filter, group }) => {
    const { groups } = await dave.client.reports.breakdown({ ...may, ...filter() });

    expect(groups.map((g) => g.groupId)).toEqual([dave.groupId(group)]);
  });

  it("totals income on personal accounts only", async () => {
    const [personal, shared] = await Promise.all([
      dave.client.reports.breakdown({ ...may, direction: "income" }),
      carol.client.reports.breakdown({ from: "2026-03-01", to: "2026-03-31", direction: "income" }),
    ]);

    expect(personal.groups.map((g) => [g.groupId, g.kind, g.totalMinor])).toEqual([
      [dave.groupId("income"), null, 300000],
    ]);
    expect(shared).toEqual({ totalMinor: 0, count: 0, groups: [] });
  });

  it("never shows another user's transactions, even filtered by their group", async () => {
    const result = await bob.client.reports.breakdown({
      ...may,
      groupId: dave.groupId("investment"),
    });

    expect(result).toEqual({ totalMinor: 0, count: 0, groups: [] });
  });
});

describe("reports.tag", () => {
  const trip = () => ({
    tag: { id: tripTagId, name: "Trip" },
    expenseMinor: 32000,
    incomeMinor: 0,
    count: 2,
    firstOn: "2026-03-05",
    lastOn: "2026-04-07",
    categories: [
      {
        direction: "expense",
        groupId: carol.groupId("leisure"),
        groupName: "Leisure",
        categoryId: carol.categoryId("holidays"),
        categoryName: "Holidays",
        totalMinor: 30000,
        count: 1,
      },
      {
        direction: "expense",
        groupId: carol.groupId("leisure"),
        groupName: "Leisure",
        categoryId: carol.categoryId("outings"),
        categoryName: "Outings",
        totalMinor: 2000,
        count: 1,
      },
    ],
  });

  it("totals a tag's live transactions at my part, by name case-insensitively", async () => {
    expect(await carol.client.reports.tag({ tagName: "TRIP" })).toEqual(trip());
  });

  it("finds the tag by id", async () => {
    expect(await carol.client.reports.tag({ tagId: tripTagId })).toEqual(trip());
  });

  it("refuses an unknown tag: NOT_FOUND", async () => {
    expect(await errorCode(carol.client.reports.tag({ tagName: "Nowhere" }))).toBe("NOT_FOUND");
  });

  it("refuses another user's tag id: NOT_FOUND", async () => {
    expect(await errorCode(bob.client.reports.tag({ tagId: tripTagId }))).toBe("NOT_FOUND");
  });

  it("resolves a shared tag name to the caller's own tag only", async () => {
    const result = await bob.client.reports.tag({ tagName: "Trip" });

    expect(result).toMatchObject({ expenseMinor: 7700, count: 1 });
  });
});

describe("reports.accounts", () => {
  it("gives real balances, not my part, and the flows between accounts", async () => {
    const result = await carol.client.reports.accounts({ asOf: "2026-03-31" });

    // Joint: +1,000 € transfer + 1,000 € deposit − 1,800 € expenses = 200 €.
    expect(result.accounts.map((a) => [a.accountId, a.shareBps, a.balanceMinor])).toEqual([
      [joint, 5000, 20000],
      [carol.accountId, 10000, -100000],
    ]);
    expect(result.flows).toEqual([
      {
        fromAccountId: carol.accountId,
        toAccountId: joint,
        sentMinor: 100000,
        receivedMinor: 100000,
        count: 1,
      },
    ]);
  });

  it("counts only transactions up to asOf", async () => {
    const result = await carol.client.reports.accounts({ asOf: "2026-03-02" });

    expect(result.accounts.map((a) => a.balanceMinor)).toEqual([200000, -100000]);
  });

  it("leaves deleted transactions and transfers out", async () => {
    const result = await dave.client.reports.accounts({});

    // Main: 2,000 + 3,000 income − 400 − 500 − 750 − 10 expenses − 100 transfer.
    expect(result.accounts.map((a) => [a.name, a.balanceMinor])).toEqual([
      ["Main", 324000],
      ["Savings", 10000],
    ]);
    expect(result.flows).toEqual([
      {
        fromAccountId: dave.accountId,
        toAccountId: daveSavings,
        sentMinor: 10000,
        receivedMinor: 10000,
        count: 1,
      },
    ]);
  });

  it("keeps archived accounts, with their archive date", async () => {
    const result = await dave.client.reports.accounts({});

    expect(result.accounts.map((a) => [a.name, a.archivedAt === null])).toEqual([
      ["Main", true],
      ["Savings", false],
    ]);
  });

  it("limits flows to the requested period", async () => {
    const result = await dave.client.reports.accounts({
      flowsFrom: "2026-06-01",
      flowsTo: "2026-06-30",
    });

    expect(result.flows).toEqual([]);
  });

  it("lists only the caller's accounts", async () => {
    const result = await bob.client.reports.accounts({});

    expect(result.accounts.map((a) => [a.accountId, a.balanceMinor])).toEqual([
      [bob.accountId, 770000],
    ]);
    expect(result.flows).toEqual([]);
  });
});
