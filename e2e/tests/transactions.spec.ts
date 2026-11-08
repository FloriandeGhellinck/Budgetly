import { expect, test } from "@playwright/test";
import { signIn } from "../sign-in";

// Smoke journey (docs/what-to-test.md): sign in by magic link, land on a
// bootstrapped space, record an expense, see it in the month overview and
// listed, delete and undo, then edit it with a new tag and get it suggested
// from history.

test("record, delete, undo, edit and get suggestions", async ({ page }, testInfo) => {
  const run = `${Date.now()}-${testInfo.project.name}`;
  const email = `e2e-${run}@example.com`;
  const name = `Bakery ${run}`;

  await signIn(page, email);

  // Quick entry: one tap from the dashboard, on phones and desktops.
  await page.getByRole("button", { name: "Add transaction" }).first().click();
  const dialog = page.getByRole("dialog", { name: "New transaction" });
  await dialog.getByLabel("Amount").fill("12,34");
  await dialog.getByLabel("Name").fill(name);
  // Bootstrap created the account Main and the default categories.
  await expect(dialog.getByLabel("Account")).toHaveText(/Main/);
  await dialog.getByLabel("Category").fill("Groc");
  await page.getByRole("option", { name: "Groceries" }).click();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved")).toBeVisible();
  await expect(dialog).toBeHidden();

  // The dashboard's month overview counts it as this month's spending.
  const overview = page.getByRole("region", { name: "Month overview" });
  await expect(overview).toContainText(/Spending\s*€12\.34/);

  await page.goto("/transactions");
  // Scoped to the page: toasts are list items too.
  const row = page.getByRole("main").getByRole("listitem").filter({ hasText: name });
  await expect(row).toContainText("Groceries");
  await expect(row).toContainText("-€12.34");

  await row.getByRole("button", { name: `Actions for ${name}` }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(row).toHaveCount(0);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("Restored")).toBeVisible();
  await expect(row).toBeVisible();

  // Edit: new amount and a tag created on the fly.
  await row.getByRole("button", { name: `Actions for ${name}` }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  const edit = page.getByRole("dialog", { name: "Edit transaction" });
  await edit.getByLabel("Amount").fill("15");
  await edit.getByLabel("Tags").fill("Trip");
  await page.getByRole("option", { name: "Create “Trip”" }).click();
  await edit.getByRole("button", { name: "Save" }).click();
  await expect(edit).toBeHidden();
  await expect(row).toContainText("-€15.00");
  await expect(row).toContainText("Trip");

  // A new transaction with a similar name is pre-filled from history (ADR 0024).
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const next = page.getByRole("dialog", { name: "New transaction" });
  await next.getByLabel("Name").fill("Bakery");
  await expect(next.getByText("Filled in from your history.")).toBeVisible();
  await expect(next.getByLabel("Category")).toHaveValue("Groceries");
});
