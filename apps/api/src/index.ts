import { createDb } from "@budgetly/db";
import type { Hono } from "hono";
import { createRemoteJWKSet } from "jose";
import { createApp } from "./create-app.ts";
import { createTokenVerifier } from "./auth.ts";
import { parseEnv } from "./env.ts";

// Entry point for Vercel (default-exported Hono app, ADR 0028) and for
// src/local-server.ts locally. Vercel only takes an entry file that imports "hono".
export const env = parseEnv(process.env);

const app: Hono = createApp({
  db: createDb(env.DATABASE_URL),
  verifyToken: createTokenVerifier({
    keys: createRemoteJWKSet(new URL(env.SUPABASE_JWKS_URL)),
    issuer: env.SUPABASE_JWT_ISSUER,
    audience: env.SUPABASE_JWT_AUDIENCE,
  }),
});

export default app;
