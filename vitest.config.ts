import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Each app and package is its own project; one with a vitest.config.ts
    // (e.g. packages/test-db, which needs a Postgres) uses that file.
    projects: ["apps/*", "packages/*"],
  },
});
