// Creates supabase/signing_keys.json (ES256) when missing. supabase/config.toml
// points at it, so every Supabase CLI command needs it to load the config:
// `pnpm db:start` locally and the production migration workflow in CI. It
// holds a private key and is gitignored; each clone generates its own.
import { generateKeyPairSync, randomUUID } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function ensureSigningKeys(root: string): void {
  const keysPath = join(root, "supabase", "signing_keys.json");
  if (existsSync(keysPath)) return;
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

if (import.meta.main) ensureSigningKeys(join(import.meta.dirname, ".."));
