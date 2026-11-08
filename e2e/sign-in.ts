import { expect, type Page } from "@playwright/test";
import { readMagicLink } from "./local-stack";

// Signs a new or returning user in by magic link and lands on the dashboard.
export async function signIn(page: Page, email: string) {
  await page.goto("/transactions");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByText(`we sent a sign-in link to ${email}`)).toBeVisible();
  await page.goto(await readMagicLink(email));
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}
