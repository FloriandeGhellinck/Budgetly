import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "api",
    environment: "node",
    globalSetup: ["@budgetly/test-db/global-setup"],
  },
});
