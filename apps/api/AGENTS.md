# apps/api

Hono + oRPC server and the MCP endpoint: the single door to data (ADR 0013).
It verifies the Supabase JWT, scopes every query to the caller, and runs
Drizzle in one transaction that sets `app.current_user_id` for RLS.

## Boundaries (enforced by `pnpm checks`)

- Implements the procedures declared in `@expense/contract`; one procedure =
  contract → `repo.ts` (Drizzle) → `handler.ts` → router.
- Never import from another app (`@expense/web` or `../web`).
- `@expense/test-db` is for test files only.
- Every procedure has an integration test on a real Postgres that also proves
  another user cannot read or change the data (`docs/what-to-test.md`).
