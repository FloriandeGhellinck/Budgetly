import { defineConfig } from "drizzle-kit";

// Only `generate` and `check` are used, so no credentials: migrations are
// applied by the Supabase CLI (and by @budgetly/test-db in tests).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "../../supabase/migrations",
  migrations: { prefix: "timestamp" },
});
