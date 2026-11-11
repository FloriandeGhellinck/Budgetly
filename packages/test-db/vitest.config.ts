import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "test-db",
    environment: "node",
    globalSetup: ["./src/global-setup.ts"],
  },
});
