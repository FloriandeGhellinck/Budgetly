// One-off import of the Notion history (ADR 0009, 0033):
//   pnpm --filter @expense/api import:notion --expenses <csv> --summary <csv> \
//     --user <uuid|email> [--summary-start-year 2025] [--dry-run]
// --dry-run reads and maps both files and prints what would be written,
// without touching any database.
import { createDb } from "@expense/db";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { z } from "zod";
import { planImport } from "./mapping.ts";
import { parseExpenses, parseSummary } from "./parse.ts";
import { createImportClient, runImport } from "./run.ts";
import { formatPlanSummary } from "./summary.ts";

const { values } = parseArgs({
  options: {
    expenses: { type: "string" },
    summary: { type: "string" },
    user: { type: "string" },
    "summary-start-year": { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
  strict: true,
});

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

if (!values.expenses || !values.summary) {
  fail("Usage: import:notion --expenses <csv> --summary <csv> --user <uuid|email> [--dry-run]");
}

const expenses = parseExpenses(readFileSync(values.expenses, "utf8"));
// The summary has no years: by default it starts in the year of the oldest expense.
const oldest = expenses.rows.map((row) => row.occurredOn).toSorted()[0];
const startYear = Number(values["summary-start-year"] ?? oldest?.slice(0, 4));
if (!Number.isInteger(startYear)) fail("Pass --summary-start-year: no dated expense to infer it.");
const summary = parseSummary(readFileSync(values.summary, "utf8"), startYear);
const plan = planImport(expenses, summary);

const months = summary.months.map((m) => m.month);
console.log(`Summary months: ${months[0] ?? "-"} → ${months.at(-1) ?? "-"} (${months.length})`);
console.log(formatPlanSummary(plan));

if (values["dry-run"]) {
  console.log("\nDry run: nothing written.");
  process.exit(0);
}

if (!values.user) fail("Pass --user <uuid|email> (or --dry-run).");
const databaseUrl = z.url().safeParse(process.env["DATABASE_URL"]).data;
if (!databaseUrl) fail("Set DATABASE_URL (the app_runtime connection, as for the API).");

// app_runtime cannot read auth.users, so an email needs a postgres-role URL.
async function resolveUserId(user: string): Promise<string> {
  if (z.uuid().safeParse(user).success) return user;
  const adminUrl = z.url().safeParse(process.env["DATABASE_ADMIN_URL"]).data;
  if (!adminUrl) fail("Pass the user id, or set DATABASE_ADMIN_URL to look up an email.");
  const admin = createDb(adminUrl);
  try {
    const rows = await admin.$client<{ id: string }[]>`
      select id from auth.users where lower(email) = lower(${user})`;
    const [row] = rows;
    if (!row || rows.length > 1) fail(`No single user with email ${user}.`);
    return row.id;
  } finally {
    await admin.$client.end();
  }
}

const userId = await resolveUserId(values.user);
const db = createDb(databaseUrl);
const client = createImportClient(db, userId);

try {
  const result = await runImport(client, plan, (done, total) => {
    if (done % 100 === 0 || done === total) console.log(`  ${done}/${total}`);
  });
  console.log(
    [
      "",
      `Created: ${result.created} transactions; already there: ${result.replayed}.`,
      `Account "Notion history": ${result.createdAccount ? "created" : "reused"}.`,
      `Beneficiary Children: ${result.createdBeneficiary ? "created" : "reused or not needed"}.`,
      `Categories created: ${result.createdCategories.length}`,
      ...result.createdCategories.map((name) => `  ${name}`),
    ].join("\n"),
  );
} finally {
  await db.$client.end();
}
