# apps/api

Hono + oRPC server: the single door to data (ADR 0013). It verifies the
Supabase JWT, scopes every query to the caller, and runs each call in one
transaction bound to them for RLS. No MCP endpoint yet (ADR 0018).

## Layout

- `src/create-app.ts`: `createApp({ db, verifyToken })` mounts `/rpc/*` and `/health`.
  `src/index.ts` validates env (`src/env.ts`) and is the Vercel entry
  (ADR 0028); `src/local-server.ts` serves it locally.
- `src/orpc.ts`: `authed` builder. Its middleware verifies the bearer token,
  wraps the call in `withUser` and refuses an `aal1` token from a user with a
  verified TOTP factor (`MFA_REQUIRED`, ADR 0032); handlers get
  `context.userId` and `context.tx`.
- `src/<namespace>/repo.ts` (Drizzle, always filtered on `userId`) →
  `handler.ts` (exports `<namespace>Router`) → `src/router.ts`.
- `src/import-notion/`: the one-off Notion history import CLI
  (`import:notion`, ADR 0033). Not a procedure: it calls the router
  in-process as a user.
- `src/pg-errors.ts`: `onConstraint` maps a constraint to the call site's
  typed error (ADR 0027).

## Run

`cp .env.example .env`, start local Supabase, then
`pnpm --filter @budgetly/api dev` (port 8787). Relative imports name the `.ts`
file: Node runs `src/` directly.

## Boundaries (enforced by `pnpm checks`)

- Implements the procedures declared in `@budgetly/contract`; `os.router`
  does not compile while one is missing. Add one with the `add-procedure`
  skill.
- Never import from another app (`@budgetly/web` or `../web`).
- `@budgetly/test-db` is for test files and `src/test-support.ts` only.
- Every procedure has an integration test on a real Postgres that also proves
  another user cannot read or change the data (`docs/what-to-test.md`).
