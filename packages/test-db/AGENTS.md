# packages/test-db

Starts a throwaway Postgres 17 in Docker for DB-backed tests and hands each
test file its own empty database. Tests need Docker running, or
`BUDGETLY_TEST_DATABASE_URL` pointing at a server they may create databases on.

## API

- `startPostgres()` → `{ url, stop() }`: a fresh container (used by globalSetup).
- `createTestDatabase()` → `{ url, sql, close() }`: an empty database on the
  run's server; call `close()` in `afterAll`.
- `migrate(sql)`: applies `supabase/migrations` in order, after a bootstrap
  that stands in for Supabase (`auth.users`, `auth.mfa_factors`, the `anon`/`authenticated` roles,
  `app_runtime` with a test password).
- `appRoleUrl(url)`: the same database logged in as `app_runtime`, so RLS
  applies. The `postgres` URL is a superuser and bypasses RLS: never prove
  isolation through it.
- `pgError(promise)` → `{ code, constraint }` of the Postgres error behind a
  failed query.
- `@budgetly/test-db/global-setup`: Vitest globalSetup that starts one server
  per run and exports its URL to workers.

## Boundaries (enforced by `pnpm checks`)

- Test-only: never imported by `apps/web`, never by non-test code.
