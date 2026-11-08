# packages/db

Drizzle ORM 0.45 schema, migrations (drizzle-kit 0.31) and RLS policies on the
`postgres` driver. Every domain table carries `user_id` and has RLS policies
created by its migration (ADR 0013).

## Boundaries (enforced by `pnpm checks`)

- Imported only by `apps/api` (runtime) and `packages/contract` (types only).
  `apps/web` must never depend on it.
- Never import from `apps/*`.
- Schema and migrations must not drift: a schema change ships with its
  migration.
