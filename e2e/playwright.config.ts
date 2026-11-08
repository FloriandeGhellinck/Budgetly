import { defineConfig, devices } from "@playwright/test";

// Runs against the full local stack (docs/local-dev.md): Supabase must be up
// (`pnpm db:start`); apps/api and apps/web are started here unless already
// running. Not part of `pnpm test`.
const WEB_URL = "http://localhost:3000";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: Boolean(process.env["CI"]),
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./global-setup.ts",
  use: {
    baseURL: WEB_URL,
    locale: "en-GB",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: "pnpm --filter @expense/api dev",
      url: "http://127.0.0.1:8787/health",
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "pnpm --filter @expense/web dev",
      url: `${WEB_URL}/login`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
