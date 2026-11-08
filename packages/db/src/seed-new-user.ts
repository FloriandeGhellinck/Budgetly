import { eq } from "drizzle-orm";
import type { Tx } from "./client";
import { accounts, beneficiaries, categories, categoryGroups } from "./schema";

// The defaults a new user starts with (ADR 0021 as amended by 0023). Names are
// stored in English; the UI translates rows that still carry their seed key.
const DEFAULT_GROUPS = [
  {
    seedKey: "daily_life",
    name: "Daily life",
    direction: "expense",
    kind: "spending",
    categories: [
      { seedKey: "groceries", name: "Groceries" },
      { seedKey: "health", name: "Health" },
      { seedKey: "clothing", name: "Clothing" },
      { seedKey: "furniture", name: "Furniture" },
      { seedKey: "childcare", name: "Childcare" },
    ],
  },
  {
    seedKey: "leisure",
    name: "Leisure",
    direction: "expense",
    kind: "spending",
    categories: [
      { seedKey: "holidays", name: "Holidays" },
      { seedKey: "outings", name: "Outings" },
      { seedKey: "gifts", name: "Gifts" },
      { seedKey: "sport", name: "Sport" },
    ],
  },
  {
    seedKey: "investment",
    name: "Investment",
    direction: "expense",
    kind: "saving",
    categories: [
      { seedKey: "stocks", name: "Stocks" },
      { seedKey: "crypto", name: "Crypto" },
      { seedKey: "real_estate", name: "Real estate" },
    ],
  },
  {
    seedKey: "debt",
    name: "Debt",
    direction: "expense",
    kind: "spending",
    categories: [{ seedKey: "loan_repayment", name: "Loan repayment" }],
  },
  {
    seedKey: "income",
    name: "Income",
    direction: "income",
    kind: null,
    categories: [
      { seedKey: "salary", name: "Salary" },
      { seedKey: "meal_vouchers", name: "Meal vouchers" },
      { seedKey: "other_income", name: "Other income" },
    ],
  },
] as const;

type DefaultGroup = (typeof DEFAULT_GROUPS)[number];

export type CategoryGroupSeedKey = DefaultGroup["seedKey"];
export type CategorySeedKey = DefaultGroup["categories"][number]["seedKey"];
export type BeneficiarySeedKey = "me";
export type AccountSeedKey = "main";

// Runs inside `withUser(db, userId, …)`, so RLS lets it write only that
// user's rows. A user who already has an account is left untouched, which
// makes a retried sign-up safe.
export async function seedNewUser(tx: Tx, userId: string): Promise<void> {
  const existing = await tx
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .limit(1);
  if (existing.length > 0) return;

  await tx
    .insert(accounts)
    .values({ userId, name: "Main", seedKey: "main", currency: "EUR", shareBps: 10000 });
  await tx.insert(beneficiaries).values({ userId, name: "Me", seedKey: "me" });

  const groups = await tx
    .insert(categoryGroups)
    .values(
      DEFAULT_GROUPS.map((group, index) => ({
        userId,
        seedKey: group.seedKey,
        name: group.name,
        direction: group.direction,
        kind: group.kind,
        sortOrder: index,
      })),
    )
    .returning({ id: categoryGroups.id, seedKey: categoryGroups.seedKey });
  const groupIds = new Map(groups.map((group) => [group.seedKey, group.id]));

  await tx.insert(categories).values(
    DEFAULT_GROUPS.flatMap((group) =>
      group.categories.map((category, index) => {
        const groupId = groupIds.get(group.seedKey);
        if (!groupId) throw new Error(`seedNewUser: group ${group.seedKey} was not created`);
        return {
          userId,
          groupId,
          direction: group.direction,
          seedKey: category.seedKey,
          name: category.name,
          sortOrder: index,
        };
      }),
    ),
  );
}
