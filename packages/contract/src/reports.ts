import { z } from "zod";
import { EXAMPLE_IDS, Id, IsoDate, Timestamp, YearMonth } from "./common";
import { errors } from "./errors";
import { procedure } from "./procedure";

// How every report counts money (ADR 0004, 0006, 0023, 0029), repeated in each
// description so an agent never has to guess.
const COUNTING =
  "Figures are the caller's part (\"my part\"): each expense counts amountMinor × its account's shareBps / 10000, rounded half up per transaction to whole cents. Income on a shared account (shareBps < 10000) is ignored; income on a personal account counts in full. Transfer legs and deleted transactions never count. Spending = expenses in groups of kind spending (and uncategorized expenses); saving = expenses in groups of kind saving. Amounts are integer cents.";

export const REPORT_TREND_MAX_MONTHS = 36;

// Months since year 0, so two YYYY-MM strings can be compared and counted.
export function monthIndex(month: string): number {
  const [year, mon] = month.split("-").map(Number);
  return (year ?? 0) * 12 + (mon ?? 1) - 1;
}

export const MonthFiguresSchema = z.object({
  month: YearMonth,
  incomeMinor: z.int(),
  spendingMinor: z.int(),
  savingMinor: z.int(),
  // income − spending − saving; negative when more left than came in.
  netMinor: z.int(),
  // saving / income in basis points (2500 = 25 %), null when income is 0.
  savingsRateBps: z.int().nullable(),
});
export type MonthFigures = z.infer<typeof MonthFiguresSchema>;

const monthOverview = procedure({
  description: `The month's income, spending, saving, net (income − spending − saving) and savings rate (saving / income in basis points, null without income), next to the previous month's figures and the change (current − previous; savingsRateBps change is null when either rate is null). ${COUNTING}`,
  examples: [{ month: "2026-11" }],
  readOnly: true,
  idempotent: true,
  input: z.object({ month: YearMonth }),
  output: z.object({
    current: MonthFiguresSchema,
    previous: MonthFiguresSchema,
    change: z.object({
      incomeMinor: z.int(),
      spendingMinor: z.int(),
      savingMinor: z.int(),
      netMinor: z.int(),
      savingsRateBps: z.int().nullable(),
    }),
  }),
  errors: {},
});

const trend = procedure({
  description: `Income, spending, saving, net and savings rate for every month from \`from\` to \`to\` (YYYY-MM, inclusive, at most ${REPORT_TREND_MAX_MONTHS} months), oldest first. Months without transactions are included with zeros. ${COUNTING}`,
  examples: [{ from: "2025-12", to: "2026-11" }],
  readOnly: true,
  idempotent: true,
  input: z
    .object({ from: YearMonth, to: YearMonth })
    .refine((p) => monthIndex(p.from) <= monthIndex(p.to), {
      message: "from must not be after to",
      path: ["to"],
    })
    .refine((p) => monthIndex(p.to) - monthIndex(p.from) < REPORT_TREND_MAX_MONTHS, {
      message: `At most ${REPORT_TREND_MAX_MONTHS} months`,
      path: ["to"],
    }),
  output: z.object({ months: z.array(MonthFiguresSchema) }),
  errors: {},
});

const BreakdownCategorySchema = z.object({
  // Null for transactions without a category.
  categoryId: Id.nullable(),
  name: z.string().nullable(),
  totalMinor: z.int(),
  count: z.int(),
});

const BreakdownGroupSchema = z.object({
  // Null for transactions without a category.
  groupId: Id.nullable(),
  name: z.string().nullable(),
  // spending or saving for expense groups (uncategorized counts as spending); null for income.
  kind: z.enum(["spending", "saving"]).nullable(),
  totalMinor: z.int(),
  count: z.int(),
  categories: z.array(BreakdownCategorySchema),
});

const breakdown = procedure({
  description: `Totals per category group, and per category inside each group, for one direction (expense by default, or income) between from and to (YYYY-MM-DD, inclusive). Groups and categories are sorted by total, largest first; count is the number of transactions counted. Transactions without a category form a bucket with null ids. Optional filters: beneficiaryId (beneficiaries.list) and groupId (categories.list); an id the caller does not own simply matches nothing. ${COUNTING}`,
  examples: [
    { from: "2026-11-01", to: "2026-11-30" },
    { from: "2026-01-01", to: "2026-12-31", beneficiaryId: EXAMPLE_IDS.beneficiary },
    { from: "2026-11-01", to: "2026-11-30", direction: "income" },
  ],
  readOnly: true,
  idempotent: true,
  input: z
    .object({
      from: IsoDate,
      to: IsoDate,
      direction: z.enum(["expense", "income"]).default("expense"),
      beneficiaryId: Id.optional(),
      groupId: Id.optional(),
    })
    .refine((p) => p.from <= p.to, { message: "from must not be after to", path: ["to"] }),
  output: z.object({
    totalMinor: z.int(),
    count: z.int(),
    groups: z.array(BreakdownGroupSchema),
  }),
  errors: {},
});

const TagCategorySchema = z.object({
  direction: z.enum(["expense", "income"]),
  // Null for transactions without a category.
  groupId: Id.nullable(),
  groupName: z.string().nullable(),
  categoryId: Id.nullable(),
  categoryName: z.string().nullable(),
  totalMinor: z.int(),
  count: z.int(),
});

const tag = procedure({
  description: `What a tag (an event or trip) cost: total expenses and income of its transactions, the first and last day they occurred on (null when none count), and totals per category, largest first. Pass tagId (tags.list) or tagName (case-insensitive). Unknown tag: NOT_FOUND. ${COUNTING}`,
  examples: [{ tagName: "Summer trip 2026" }, { tagId: EXAMPLE_IDS.tag }],
  readOnly: true,
  idempotent: true,
  input: z.union([
    z.object({ tagId: Id }),
    z.object({ tagName: z.string().trim().min(1).max(100) }),
  ]),
  output: z.object({
    tag: z.object({ id: Id, name: z.string() }),
    expenseMinor: z.int(),
    incomeMinor: z.int(),
    count: z.int(),
    firstOn: IsoDate.nullable(),
    lastOn: IsoDate.nullable(),
    categories: z.array(TagCategorySchema),
  }),
  errors: errors("NOT_FOUND"),
});

const accounts = procedure({
  description:
    "Balance of every account (archived ones included) at the end of asOf (YYYY-MM-DD; all recorded transactions when omitted), and the money moved between accounts. Balances use real amounts, not the caller's share: income and incoming transfers add, expenses and outgoing transfers subtract; deleted transactions do not count. There is no opening balance yet, so a balance is relative: the net of the transactions recorded on that account, not necessarily the bank's figure (ADR 0029). flows sums live transfers per from → to pair between flowsFrom and flowsTo (inclusive; defaults: from the first transfer up to asOf), with what was sent and what arrived (they differ by fees or conversion).",
  examples: [{}, { asOf: "2026-10-31" }, { flowsFrom: "2026-11-01", flowsTo: "2026-11-30" }],
  readOnly: true,
  idempotent: true,
  input: z.object({
    asOf: IsoDate.optional(),
    flowsFrom: IsoDate.optional(),
    flowsTo: IsoDate.optional(),
  }),
  output: z.object({
    asOf: IsoDate.nullable(),
    accounts: z.array(
      z.object({
        accountId: Id,
        name: z.string(),
        currency: z.string(),
        shareBps: z.int(),
        archivedAt: Timestamp.nullable(),
        // Signed cents: negative when more was recorded leaving than arriving.
        balanceMinor: z.int(),
      }),
    ),
    flows: z.array(
      z.object({
        fromAccountId: Id,
        toAccountId: Id,
        sentMinor: z.int(),
        receivedMinor: z.int(),
        count: z.int(),
      }),
    ),
  }),
  errors: {},
});

export const reportsContract = { monthOverview, trend, breakdown, tag, accounts };
