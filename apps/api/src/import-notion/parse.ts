import { createHash } from "node:crypto";
import { csvRows } from "./csv.ts";

// Why a row was not imported. Reasons never quote the row's content, so a
// printed report carries no names.
export type Skipped = { source: "expenses" | "summary"; row: number; reason: string };

const MONTHS = [
  "janvier",
  "fevrier",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "aout",
  "septembre",
  "octobre",
  "novembre",
  "decembre",
];

// "Février", "fevrier", "Aout" and "août" all name the same month: the two
// exports disagree on accents.
export function frenchMonthNumber(name: string): number | null {
  const key = name.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase();
  const index = MONTHS.indexOf(key);
  return index === -1 ? null : index + 1;
}

const pad = (n: number) => String(n).padStart(2, "0");

// "6 novembre 2026" → "2026-11-06". Null when it is not a real day.
export function parseFrenchDate(text: string): string | null {
  const match = /^(\d{1,2})(?:er)?\s+(\p{L}+)\s+(\d{4})$/u.exec(text.trim());
  if (!match) return null;
  const [, dayText = "", monthText = "", yearText = ""] = match;
  const month = frenchMonthNumber(monthText);
  const day = Number(dayText);
  const year = Number(yearText);
  if (!month) return null;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

// "1 234,56 €" → 123456 cents. Thousands may be separated by any space
// (regular, no-break, narrow no-break) or a dot. Built from the digit strings,
// never through a float. Null when unreadable or negative.
export function parseEuroAmount(text: string): number | null {
  const compact = text.replace(/€/g, "").replace(/\s/g, "");
  const match = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(compact);
  if (!match) return null;
  const [, units = "", fraction = ""] = match;
  return Number(units.replace(/\./g, "")) * 100 + Number(fraction.padEnd(2, "0"));
}

export type ExpenseRow = {
  // 1-based data row in the file (the header is not counted).
  row: number;
  // Stable across re-runs and re-exports: see idempotencyKeys().
  idempotencyKey: string;
  name: string;
  occurredOn: string;
  amountMinor: number;
  category: string;
  subCategory: string;
  type: string;
  card: string;
};

export type ParsedExpenses = { rows: ExpenseRow[]; blankRows: number; skipped: Skipped[] };

const EXPENSE_FIELDS = [
  "Nom",
  "Date",
  "Catégorie",
  "Sous catégorie",
  "Montant",
  "Carte",
  "Type",
] as const;

// One key per row from its raw content plus its rank among identical rows
// (two coffees on the same day), so re-running the same or a newer export
// never records a row twice, and a row added elsewhere does not shift keys.
export function idempotencyKeys(prefix: string, contents: string[]): string[] {
  const seen = new Map<string, number>();
  return contents.map((content) => {
    const hash = createHash("sha256").update(content).digest("hex").slice(0, 32);
    const rank = (seen.get(hash) ?? 0) + 1;
    seen.set(hash, rank);
    return `${prefix}:${hash}:${rank}`;
  });
}

function skipReason(
  dateText: string,
  amountText: string,
  occurredOn: string | null,
  amountMinor: number | null,
): string | null {
  if (dateText === "" && amountText === "") return "no date and no amount";
  if (dateText === "") return "no date";
  if (amountText === "") return "no amount";
  if (!occurredOn) return "unreadable date";
  if (amountMinor === null) return "unreadable amount";
  if (amountMinor === 0) return "zero amount";
  return null;
}

export function parseExpenses(text: string): ParsedExpenses {
  const { header, rows } = csvRows(text);
  const missing = EXPENSE_FIELDS.filter((field) => !header.includes(field));
  if (missing.length > 0) {
    throw new Error(`Expenses file: missing column(s) ${missing.join(", ")}`);
  }

  const skipped: Skipped[] = [];
  let blankRows = 0;
  const kept: Omit<ExpenseRow, "idempotencyKey">[] = [];
  const contents: string[] = [];

  for (const [index, raw] of rows.entries()) {
    const row = index + 1;
    const field = (name: (typeof EXPENSE_FIELDS)[number]) => (raw[name] ?? "").trim();
    if (EXPENSE_FIELDS.every((name) => field(name) === "")) {
      blankRows += 1;
      continue;
    }
    const dateText = field("Date");
    const amountText = field("Montant");
    const occurredOn = parseFrenchDate(dateText);
    const amountMinor = parseEuroAmount(amountText);
    const reason = skipReason(dateText, amountText, occurredOn, amountMinor);
    if (reason || !occurredOn || !amountMinor) {
      skipped.push({ source: "expenses", row, reason: reason ?? "unreadable row" });
      continue;
    }

    kept.push({
      row,
      name: field("Nom"),
      occurredOn,
      amountMinor,
      category: field("Catégorie").normalize("NFC"),
      subCategory: field("Sous catégorie").normalize("NFC"),
      type: field("Type").normalize("NFC"),
      card: field("Carte"),
    });
    contents.push(EXPENSE_FIELDS.map(field).join("\u001f"));
  }

  const keys = idempotencyKeys("notion:expense", contents);
  return {
    rows: kept.map((row, index) => ({ ...row, idempotencyKey: keys[index] ?? "" })),
    blankRows,
    skipped,
  };
}

// The summary names months without a year, oldest first: the year starts at
// startYear and moves on each time the month does not move forward.
export function inferYears(months: number[], startYear: number): number[] {
  let year = startYear;
  return months.map((month, index) => {
    const previous = months[index - 1];
    if (previous !== undefined && month <= previous) year += 1;
    return year;
  });
}

export const INCOME_COLUMNS = {
  Salaire: "salary",
  "Chèques repas": "meal_vouchers",
  "Autres revenus": "other_income",
} as const;
export type IncomeSeedKey = (typeof INCOME_COLUMNS)[keyof typeof INCOME_COLUMNS];
type IncomeColumn = keyof typeof INCOME_COLUMNS;

export type SummaryMonth = {
  row: number;
  // YYYY-MM
  month: string;
  income: { column: IncomeColumn; seedKey: IncomeSeedKey; amountMinor: number }[];
  // Notion's own DEPENSES total, kept only to cross-check the import.
  notionSpendingMinor: number | null;
};

export type ParsedSummary = { months: SummaryMonth[]; blankRows: number; skipped: Skipped[] };

export function parseSummary(text: string, startYear: number): ParsedSummary {
  const { header, rows } = csvRows(text);
  const required = ["Month", ...Object.keys(INCOME_COLUMNS)];
  const missing = required.filter((name) => !header.includes(name));
  if (missing.length > 0) {
    throw new Error(`Summary file: missing column(s) ${missing.join(", ")}`);
  }

  const skipped: Skipped[] = [];
  let blankRows = 0;
  const dated: { row: number; month: number; raw: Record<string, string> }[] = [];
  rows.forEach((raw, index) => {
    const row = index + 1;
    if (Object.values(raw).every((value) => value.trim() === "")) {
      blankRows += 1;
      return;
    }
    const month = frenchMonthNumber(raw["Month"] ?? "");
    if (!month) {
      skipped.push({ source: "summary", row, reason: "unreadable month" });
      return;
    }
    dated.push({ row, month, raw });
  });

  const years = inferYears(
    dated.map((entry) => entry.month),
    startYear,
  );
  const months = dated.map(({ row, month, raw }, index): SummaryMonth => {
    const income: SummaryMonth["income"] = [];
    for (const [column, seedKey] of Object.entries(INCOME_COLUMNS) as [
      IncomeColumn,
      IncomeSeedKey,
    ][]) {
      const text = (raw[column] ?? "").trim();
      if (text === "") continue;
      const amountMinor = parseEuroAmount(text);
      if (amountMinor === null) {
        skipped.push({ source: "summary", row, reason: `unreadable amount in ${column}` });
        continue;
      }
      if (amountMinor > 0) income.push({ column, seedKey, amountMinor });
    }
    const spendingText = (raw["DEPENSES"] ?? "").trim();
    return {
      row,
      month: `${years[index]}-${pad(month)}`,
      income,
      notionSpendingMinor: spendingText === "" ? null : parseEuroAmount(spendingText),
    };
  });
  return { months, blankRows, skipped };
}
