import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApi, signUpSeeded, type SeededUser, type TestApi } from "../test-support.ts";
import { planImport, type ImportPlan } from "./mapping.ts";
import { parseExpenses, parseSummary } from "./parse.ts";
import { runImport, type ImportResult } from "./run.ts";

// Synthetic exports. Amounts are chosen so every figure checks on paper:
// January: spending 1000 + 550 + 1000 = 2550, saving 10000, income 305000.
// December: spending 200 (unsorted), income 310000.
const EXPENSES = [
  '\uFEFFNom,Date,Catégorie,Sous catégorie,Montant,Carte,"Type "',
  'Groceries,5 janvier 2026,Dépenses générales,Bouffe,"10,00 €",Oui,',
  'Toy,6 janvier 2026,Enfants,Jouets,"5,50 €",,Birthday ',
  'ETF,7 janvier 2026,Investissement,Bourse,"100,00 €",,',
  'Groceries,5 janvier 2026,Dépenses générales,Bouffe,"10,00 €",Oui,',
  'Bread,10 décembre 2025,Dépenses générales,,"2,00 €",,',
  "Name only,,,,,,",
  ",,,,,,",
].join("\r\n");

const SUMMARY = [
  "\uFEFFMonth,Salaire,Chèques repas,Autres revenus,TOTAL,DEPENSES,Solde,Mois",
  'Décembre,"3 000,00 €","100,00 €",,,,,Décembre',
  'Janvier,"3 000,00 €",,"50,00 €",,,,Janvier',
].join("\n");

let api: TestApi;
let user: SeededUser;
let plan: ImportPlan;
let first: ImportResult;
let second: ImportResult;
let existingBourse: string;

beforeAll(async () => {
  api = await createTestApi();
  user = await signUpSeeded(api);
  // Already there before the import: must be reused, not duplicated.
  existingBourse = (
    await user.client.categories.create({ groupId: user.groupId("investment"), name: "Bourse" })
  ).id;
  plan = planImport(parseExpenses(EXPENSES), parseSummary(SUMMARY, 2025));
  first = await runImport(user.client, plan);
  second = await runImport(user.client, plan);
});

afterAll(async () => {
  await api.close();
});

describe("runImport", () => {
  it("records every planned row once, and nothing on a second run", () => {
    expect([first.created, first.replayed]).toEqual([9, 0]);
    expect([second.created, second.replayed]).toEqual([0, 9]);
  });

  it("reuses an existing category and creates each missing one once", async () => {
    expect(first.createdCategories.toSorted()).toEqual([
      "daily_life / Bouffe",
      "daily_life / À classer",
      "leisure / Jouets",
    ]);
    expect(second.createdCategories).toEqual([]);
    const { items } = await user.client.transactions.list({ text: "ETF" });
    expect(items.map((t) => t.categoryId)).toEqual([existingBourse]);
  });

  it("puts everything on one Notion history account and files the toy for Children", async () => {
    const { items: accounts } = await user.client.accounts.list({});
    const history = accounts.filter((a) => a.name === "Notion history");
    expect(history.map((a) => a.shareBps)).toEqual([10_000]);
    const { items: people } = await user.client.beneficiaries.list({});
    const children = people.filter((b) => b.name === "Children");
    expect(children).toHaveLength(1);
    const { items } = await user.client.transactions.list({ beneficiaryId: children[0]?.id });
    expect(items.map((t) => [t.name, t.tags, t.accountId])).toEqual([
      ["Toy", ["Birthday"], history[0]?.id],
    ]);
  });

  it("gives reports.monthOverview the expected figures", async () => {
    const { current, previous } = await user.client.reports.monthOverview({ month: "2026-01" });
    expect(current).toMatchObject({
      incomeMinor: 305_000,
      spendingMinor: 2550,
      savingMinor: 10_000,
      netMinor: 305_000 - 2550 - 10_000,
    });
    expect(previous).toMatchObject({ incomeMinor: 310_000, spendingMinor: 200, savingMinor: 0 });
  });
});
