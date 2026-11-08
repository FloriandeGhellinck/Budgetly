import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "api",
    environment: "node",
    globalSetup: ["@expense/test-db/global-setup"],
  },
});
