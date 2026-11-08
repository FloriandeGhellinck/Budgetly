import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "db",
    environment: "node",
    globalSetup: ["@expense/test-db/global-setup"],
  },
});
