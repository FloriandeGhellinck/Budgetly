import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "db",
    environment: "node",
    globalSetup: ["@budgetly/test-db/global-setup"],
  },
});
