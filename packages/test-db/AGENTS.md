# packages/test-db

Starts a throwaway Postgres 17 in Docker for DB-backed tests and hands each
test file its own empty database. Tests need Docker running, or
`EXPENSE_TEST_DATABASE_URL` pointing at a server they may create databases on.

## API

- `startPostgres()` → `{ url, stop() }`: a fresh container (used by globalSetup).
- `createTestDatabase()` → `{ url, sql, close() }`: an empty database on the
  run's server; call `close()` in `afterAll`.
- `@expense/test-db/global-setup`: Vitest globalSetup that starts one server
  per run and exports its URL to workers.

## Boundaries (enforced by `pnpm checks`)

- Test-only: never imported by `apps/web`, never by non-test code.
