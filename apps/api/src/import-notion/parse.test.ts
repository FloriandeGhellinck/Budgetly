import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv.ts";
import {
  idempotencyKeys,
  inferYears,
  parseEuroAmount,
  parseExpenses,
  parseFrenchDate,
  parseSummary,
} from "./parse.ts";

// Synthetic exports in Notion's shape: BOM, "Type " header, CRLF, trailing blank rows.
const EXPENSES_HEADER = '\uFEFFNom,Date,Catégorie,Sous catégorie,Montant,Carte,"Type "';

describe("parseCsv", () => {
  it("reads quoted commas, escaped quotes and line breaks, with CRLF or LF", () => {
    const text = '\uFEFFa,b\r\n"1,5 €","say ""hi"""\n"two\nlines",x';
    expect(parseCsv(text)).toEqual([
      ["a", "b"],
      ["1,5 €", 'say "hi"'],
      ["two\nlines", "x"],
    ]);
  });
});

describe("parseFrenchDate", () => {
  it.each([
    ["a plain day", "6 novembre 2026", "2026-11-06"],
    ["an accented month", "14 février 2026", "2026-02-14"],
    ["a month spelled without its accent", "3 aout 2026", "2026-08-03"],
    ["a capitalised month", "1 Décembre 2025", "2025-12-01"],
    ["1er", "1er mai 2026", "2026-05-01"],
  ])("reads %s", (_, text, expected) => {
    expect(parseFrenchDate(text)).toBe(expected);
  });

  it.each([
    ["an impossible day", "31 avril 2026"],
    ["an unknown month", "6 brumaire 2026"],
    ["an ISO date", "2026-11-06"],
  ])("refuses %s", (_, text) => {
    expect(parseFrenchDate(text)).toBeNull();
  });
});

describe("parseEuroAmount", () => {
  it.each([
    ["cents with a no-break space before €", "2,75\u00a0€", 275],
    ["thousands with a narrow no-break space", "4\u202f321,09\u00a0€", 432_109],
    ["thousands with a regular space", "1 200,5 €", 120_050],
    ["thousands with a dot", "1.200,00 €", 120_000],
    ["no decimals", "15 €", 1500],
  ])("reads %s", (_, text, expected) => {
    expect(parseEuroAmount(text)).toBe(expected);
  });

  it.each([
    ["a negative amount", "-3,00 €"],
    ["a decimal point", "3.5 €"],
    ["text", "beaucoup"],
  ])("refuses %s", (_, text) => {
    expect(parseEuroAmount(text)).toBeNull();
  });
});

describe("inferYears", () => {
  it("moves to the next year when the month wraps", () => {
    expect(inferYears([10, 11, 12, 1, 2, 11], 2025)).toEqual([2025, 2025, 2025, 2026, 2026, 2026]);
  });

  it("counts a repeated month as the next year", () => {
    expect(inferYears([10, 10], 2025)).toEqual([2025, 2026]);
  });
});

describe("idempotencyKeys", () => {
  it("gives identical rows distinct keys and is stable across runs", () => {
    const first = idempotencyKeys("p", ["coffee", "coffee", "bread"]);
    expect(new Set(first).size).toBe(3);
    expect(idempotencyKeys("p", ["coffee", "coffee", "bread"])).toEqual(first);
  });

  it("keeps a row's key when another row is inserted before it", () => {
    const [, bread] = idempotencyKeys("p", ["coffee", "bread"]);
    expect(idempotencyKeys("p", ["tea", "coffee", "bread"])[2]).toBe(bread);
  });
});

describe("parseExpenses", () => {
  const text = [
    EXPENSES_HEADER,
    'Bread,6 novembre 2026,Dépenses générales,Bouffe,"2,10 €",Oui,Trip ',
    "Name only,,,,,,",
    'No date,,Loisirs,Sport,"4,00 €",,',
    'Bad date,32 mai 2026,Loisirs,Sport,"4,00 €",,',
    ",,,,,,",
    ",,,,,,",
  ].join("\r\n");
  const parsed = parseExpenses(text);

  it("keeps a dated row with its cents, trimmed type and data row number", () => {
    expect(parsed.rows).toEqual([
      expect.objectContaining({
        row: 1,
        name: "Bread",
        occurredOn: "2026-11-06",
        amountMinor: 210,
        category: "Dépenses générales",
        subCategory: "Bouffe",
        type: "Trip",
        card: "Oui",
      }),
    ]);
  });

  it("counts blank rows and reports the other dropped rows by number", () => {
    expect(parsed.blankRows).toBe(2);
    expect(parsed.skipped).toEqual([
      { source: "expenses", row: 2, reason: "no date and no amount" },
      { source: "expenses", row: 3, reason: "no date" },
      { source: "expenses", row: 4, reason: "unreadable date" },
    ]);
  });
});

describe("parseSummary", () => {
  const text = [
    "\uFEFFMonth,Salaire,Chèques repas,Autres revenus,TOTAL,DEPENSES,Solde,Mois",
    'Décembre,"3 000,00 €","100,00 €",,"3 100,00 €",,"3 100,00 €",Décembre',
    'Janvier,"3 000,00 €",,"50,00 €","3 050,00 €","2 000,00 €","1 050,00 €",Janvier',
  ].join("\n");

  it("dates each month from the start year and keeps the non-empty income columns", () => {
    const { months } = parseSummary(text, 2025);
    expect(months).toEqual([
      {
        row: 1,
        month: "2025-12",
        income: [
          { column: "Salaire", seedKey: "salary", amountMinor: 300_000 },
          { column: "Chèques repas", seedKey: "meal_vouchers", amountMinor: 10_000 },
        ],
        notionSpendingMinor: null,
      },
      {
        row: 2,
        month: "2026-01",
        income: [
          { column: "Salaire", seedKey: "salary", amountMinor: 300_000 },
          { column: "Autres revenus", seedKey: "other_income", amountMinor: 5000 },
        ],
        notionSpendingMinor: 200_000,
      },
    ]);
  });
});
