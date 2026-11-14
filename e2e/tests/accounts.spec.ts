import { expect, test } from "@playwright/test";
import { signIn } from "../sign-in";

// Smoke journey: create a shared account with a percentage share, adjust its
// balance to the bank's figure, then archive and unarchive it.
test("create a shared account, adjust its balance, archive and unarchive it", async ({
  page,
}, testInfo) => {
  const run = `${Date.now()}-${testInfo.project.name}`;
  const name = `Joint ${run}`;

  await signIn(page, `e2e-accounts-${run}@example.com`);
  await page.goto("/accounts");
  const active = page.getByRole("list", { name: "Active accounts" });
  await expect(active.getByRole("listitem").filter({ hasText: "Main" })).toBeVisible();

  await page.getByRole("button", { name: "New account" }).click();
  const dialog = page.getByRole("dialog", { name: "New account" });
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByRole("switch", { name: "Shared account" }).click();
  await dialog.getByLabel("Your share").fill("50");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Account saved")).toBeVisible();
  await expect(dialog).toBeHidden();

  const row = active.getByRole("listitem").filter({ hasText: name });
  await expect(row).toContainText("Shared · your share 50%");
  await expect(row).toContainText("Relative balance");

  await row.getByRole("button", { name: `Actions for ${name}` }).click();
  await page.getByRole("menuitem", { name: "Adjust balance" }).click();
  const adjust = page.getByRole("dialog", { name: `Adjust the balance of ${name}` });
  await adjust.getByLabel("Balance at your bank").fill("-12.50");
  await adjust.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Balance adjusted")).toBeVisible();
  await expect(adjust).toBeHidden();
  await expect(row.getByLabel(`Balance of ${name}`)).toHaveText(/-€12\.50/);
  await expect(row).not.toContainText("Relative balance");

  await row.getByRole("button", { name: `Actions for ${name}` }).click();
  await page.getByRole("menuitem", { name: "Archive" }).click();
  const archived = page.getByRole("list", { name: "Archived" });
  await expect(archived.getByRole("listitem").filter({ hasText: name })).toBeVisible();
  await expect(row).toHaveCount(0);

  await archived.getByRole("button", { name: `Actions for ${name}` }).click();
  await page.getByRole("menuitem", { name: "Unarchive" }).click();
  await expect(row).toBeVisible();
  await expect(archived).toHaveCount(0);
});
