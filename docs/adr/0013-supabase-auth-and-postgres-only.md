# 13. Supabase for auth and Postgres only; all data through oRPC

Status: accepted (2026-11-08)

## Context

With Supabase chosen (ADR 0012), the browser could read and write directly
through PostgREST, or all access could go through our own API. The app must
be agent-friendly: the web UI and the MCP server must share the same rules.

## Decision

- Supabase provides **Postgres** and **Auth** only. The browser uses Supabase
  solely to sign in and hold a session; it never queries data via PostgREST.
- Every read and write goes through the **oRPC API server**, which verifies
  the Supabase JWT, scopes every query to that user, and queries Postgres with
  **Drizzle**.
- Each API call runs in one transaction that sets the current user via
  `set_config` (e.g. `app.current_user_id`). **RLS policies** check row ownership (`user_id`)
  as defence in depth.
- Same pattern as the author's Titan project.

## Consequences

- Business rules (two-leg transfers, shares, category kinds, reports) live in
  one place and are reused by UI and MCP.
- Drizzle migrations must also create the RLS policies.
- Self-hosting needs a Postgres URL and a Supabase-compatible auth issuer.
