import "server-only";
import { z } from "zod";

// Server-only configuration. Nothing here is NEXT_PUBLIC_: the browser never
// talks to Supabase or the API directly (ADR 0014, 0030).
const EnvSchema = z.object({
  API_URL: z.url(),
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SITE_URL: z.url(),
  AUTH_GOOGLE_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

// Parsed on first use, not at import, so `next build` runs without the variables.
export function env(): Env {
  if (cached) return cached;
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`apps/web: invalid environment\n${z.prettifyError(result.error)}`);
  }
  cached = result.data;
  return cached;
}
