import { createDb } from "@budgetly/db";
import { createRemoteJWKSet } from "jose";
import { createApp } from "./app.ts";
import { createTokenVerifier } from "./auth.ts";
import { parseEnv } from "./env.ts";

// Entry point for Vercel (default-exported Hono app, ADR 0028) and for
// src/local-server.ts locally.
export const env = parseEnv(process.env);

const app = createApp({
  db: createDb(env.DATABASE_URL),
  verifyToken: createTokenVerifier({
    keys: createRemoteJWKSet(new URL(env.SUPABASE_JWKS_URL)),
    issuer: env.SUPABASE_JWT_ISSUER,
    audience: env.SUPABASE_JWT_AUDIENCE,
  }),
});

export default app;
