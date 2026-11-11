import { z } from "zod";

const EnvSchema = z.object({
  // Logs in as app_runtime, so RLS applies (ADR 0026). Never the postgres role.
  DATABASE_URL: z.url(),
  SUPABASE_JWKS_URL: z.url(),
  SUPABASE_JWT_ISSUER: z.string().min(1),
  SUPABASE_JWT_AUDIENCE: z.string().min(1).default("authenticated"),
  PORT: z.coerce.number().int().positive().default(8787),
});

export type Env = z.infer<typeof EnvSchema>;

// Fails at boot with every missing or malformed variable named.
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`apps/api: invalid environment\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
