# 26. Database shape: shares in basis points, integrity in Postgres, one RLS role

Status: accepted (2026-11-08)

## Context

ADRs 0003–0006, 0010, 0013 and 0023 say what the data is, not how Postgres
holds it. The first schema had to pick a share representation, decide where
integrity rules live, and name the role RLS applies to.

## Decision

- **Share in basis points**: `accounts.share_bps` is an integer from 1 to
  10000 (10000 = personal, 5000 = joint 50 %). Reports multiply integer cents
  by an integer, so "my part" never needs floats.
- **Integrity in the database**, not only in the API:
  - Every reference carries `user_id` (composite foreign keys on
    `(user_id, id)`), so a row can never point at another user's row, even
    if a query forgets to scope.
  - `direction` is one enum shared by transactions and category groups.
    Categories copy their group's direction, and the transaction → category
    key includes it, so an expense cannot be filed under an income category.
  - CHECKs: positive `amount_minor`; transfer legs have a `transfer_id` and no
    category or beneficiary; expenses and incomes have no `transfer_id`; at
    most one leg per direction per transfer.
- **Income categories have their own group**, with `direction = 'income'`
  and a null `kind`: spending vs saving (ADR 0004) only splits expenses.
- **Seed keys**: defaults created at sign-up carry a stable `seed_key`
  (`daily_life`, `salary`, `me`…). Names are stored in English; the UI shows
  the translation of a row that still has its seed key. Renaming a default
  clears it.
- **One runtime role, `app_runtime`**: login, not superuser, no
  `BYPASSRLS`. Every table has RLS enabled and forced and one owner policy
  for `app_runtime`: `user_id = app.current_user_id`, set per transaction by
  `withUser`. Supabase's `anon` and `authenticated` get no grants in
  `public` (ADR 0013). Migrations run as `postgres`.
- **Migrations live in `supabase/migrations/`**: drizzle-kit generates the
  table DDL; RLS, roles and grants are hand-written custom migrations in the
  same chain. `pnpm checks` fails when the schema and the latest snapshot
  disagree.

## Consequences

- Production needs two connection strings: `postgres` for migrations,
  `app_runtime` for apps/api.
- A new table needs its RLS policy in a migration; a test fails otherwise.
- Changing a group's direction cascades to its categories and is refused
  while transactions use them.
