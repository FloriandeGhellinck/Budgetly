// Fails when packages/db/src/schema and the latest drizzle snapshot disagree,
// i.e. a schema change was made without generating its migration.
//
// `drizzle-kit check` only validates the snapshot chain itself. The probe runs
// `generate` into a throwaway folder seeded with a copy of the real `meta/`:
// drizzle diffs the schema against the newest snapshot exactly as it would for
// real, but writes nowhere we keep. A `.sql` file appearing means drift.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const dbPackage = join(root, "packages/db");
const realMeta = join(root, "supabase/migrations/meta");

// drizzle-kit prefixes `--out` with "./", so the probe must be relative to cwd.
const PROBE_DIR = ".schema-drift-probe";
const probe = join(dbPackage, PROBE_DIR);

// process.exit would skip the cleanup in `finally`, so failures throw.
class DriftError extends Error {}

function fail(lines: string[]): never {
  throw new DriftError(["", ...lines, ""].join("\n"));
}

try {
  rmSync(probe, { recursive: true, force: true });
  cpSync(realMeta, join(probe, "meta"), { recursive: true });

  let stdout: string;
  try {
    // drizzle-kit refuses --config alongside other flags, so restate the config.
    stdout = execFileSync(
      join(dbPackage, "node_modules/.bin/drizzle-kit"),
      [
        "generate",
        "--dialect",
        "postgresql",
        "--schema",
        "./src/schema/index.ts",
        "--out",
        PROBE_DIR,
        "--prefix",
        "timestamp",
      ],
      { cwd: dbPackage, encoding: "utf8", stdio: "pipe" },
    );
  } catch (error) {
    const failed = error as { stdout?: Buffer | string; message: string };
    stdout = failed.stdout?.toString() ?? failed.message;
  }

  // A probe that did not run cannot say the schema is clean.
  if (!/No schema changes|Your SQL migration file/.test(stdout)) {
    fail(["Could not run the schema-drift probe:", "", stdout.trimEnd()]);
  }

  const emitted = existsSync(probe) ? readdirSync(probe).filter((f) => f.endsWith(".sql")) : [];
  if (emitted.length > 0) {
    const ddl = emitted.map((f) => readFileSync(join(probe, f), "utf8")).join("\n");
    fail([
      "Schema drift: packages/db/src/schema and the latest migration snapshot disagree.",
      "Generate the migration:  pnpm --filter @budgetly/db db:generate --name=<slug>",
      "",
      ddl.trimEnd(),
    ]);
  }

  console.log("Schema and migration snapshot agree.");
} catch (error) {
  if (!(error instanceof DriftError)) throw error;
  console.error(error.message);
  process.exitCode = 1;
} finally {
  rmSync(probe, { recursive: true, force: true });
}
