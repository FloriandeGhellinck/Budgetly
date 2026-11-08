import { expect, type Page, test } from "@playwright/test";
import { readMagicLink } from "../local-stack";

// Smoke journey (docs/what-to-test.md): sign in by magic link, land on a
// bootstrapped space, record an expense, see it listed, delete and undo.

async function signIn(page: Page, email: string) {
  await page.goto("/transactions");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByText(`we sent a sign-in link to ${email}`)).toBeVisible();
  await page.goto(await readMagicLink(email));
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test("record an expense, delete it and undo", async ({ page }, testInfo) => {
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
});
