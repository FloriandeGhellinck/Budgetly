// `pnpm db:start`: local Supabase with an asymmetric JWT signing key.
// apps/api only accepts ES256/RS256 tokens (ADR 0027), so the key file the
// config points at must exist before the first start.
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { ensureSigningKeys } from "./ensure-signing-keys.ts";

const root = join(import.meta.dirname, "..");
ensureSigningKeys(root);

const result = spawnSync("supabase", ["start", ...process.argv.slice(2)], {
  cwd: root,
  stdio: "inherit",
});
process.exit(result.status ?? 1);
