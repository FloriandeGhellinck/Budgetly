// `pnpm db:start`: local Supabase with an asymmetric JWT signing key.
// apps/api only accepts ES256/RS256 tokens (ADR 0027), so the key file the
// config points at must exist before the first start. It holds a private key
// and is gitignored; each clone generates its own.
import { spawnSync } from "node:child_process";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const keysPath = join(root, "supabase", "signing_keys.json");

if (!existsSync(keysPath)) {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const jwk = {
    ...privateKey.export({ format: "jwk" }),
    kid: randomUUID(),
    alg: "ES256",
    use: "sig",
    key_ops: ["sign", "verify"],
    ext: true,
  };
  writeFileSync(keysPath, `${JSON.stringify([jwk], null, 2)}\n`, { mode: 0o600 });
  console.log("Generated supabase/signing_keys.json (ES256).");
}

const result = spawnSync("supabase", ["start", ...process.argv.slice(2)], {
  cwd: root,
  stdio: "inherit",
});
process.exit(result.status ?? 1);
