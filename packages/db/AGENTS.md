# packages/db

Drizzle ORM 0.45 schema, migrations (drizzle-kit 0.31) and RLS policies on the
`postgres` driver. Every domain table carries `user_id` and has RLS policies
created by its migration (ADR 0013, 0026).

## API

- `createDb(url)` → Drizzle client. In apps/api, `url` logs in as
  `app_runtime` (no BYPASSRLS). Close with `db.$client.end()`.
- `withUser(db, userId, fn)`: runs `fn(tx)` in one transaction bound to the
  user for RLS. All request work goes through it.
- `seedNewUser(tx, userId)`: sign-up defaults (ADR 0021, 0023), inside
  `withUser`.
- Tables, enums and row types (`Transaction`, `NewTransaction`…) for
  `packages/contract` (`import type` only).

## Add a table

1. Schema in `src/schema/<table>.ts`, exported from `src/schema/index.ts`:
   `userId()`, a `unique(user_id, id)` if others reference it, and composite
   foreign keys `(user_id, x_id)` for every reference. Name constraints.
2. `pnpm --filter @budgetly/db db:generate --name=<slug>`.
3. `pnpm --filter @budgetly/db db:generate --custom --name=<slug>_rls`, then
   write: enable + force RLS and a `<table>_owner` policy, copied from
   `supabase/migrations/*_rls.sql`. Grants come from default privileges.
4. Add the table to the isolation tests in `src/rls.db.test.ts`; constraints
   you chose get a case in `src/constraints.db.test.ts`.

Never edit a generated migration or a snapshot in `supabase/migrations/meta`;
generate a new one. Tests apply the migrations through `@budgetly/test-db`.

## Boundaries (enforced by `pnpm checks`)

- Imported only by `apps/api` (runtime) and `packages/contract` (types only).
  `apps/web` must never depend on it.
- Never import from `apps/*`.
- Schema and migrations must not drift: `pnpm schema-drift` fails when the
  schema has changes no migration captures.
