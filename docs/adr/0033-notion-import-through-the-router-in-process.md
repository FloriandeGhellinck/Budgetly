# 33. The Notion import runs the API router in-process as the user

Status: accepted (2026-11-08). Amends ADR 0009.

## Context

ADR 0009 decided a one-off import of the Notion history; ADR 0010 says how
its columns map. The import must apply the same rules as any other write
(category direction, tags created on the fly, idempotency) and be safe to
re-run. Going over HTTP would need a Supabase access token for the user, at
`aal2` if they enrolled a TOTP factor (ADR 0032): a token copied from a
browser session, valid for an hour, for a script run once.

## Decision

- `pnpm --filter @expense/api import:notion` builds the real oRPC router
  in-process (`createRouterClient`) on `DATABASE_URL` (`app_runtime`, so RLS
  applies), with a `verifyToken` that resolves one fixed in-process token to
  the chosen user at `aal2`. Every write still goes through the handlers,
  `withUser` and the idempotency keys. No Supabase token is involved: whoever
  holds `DATABASE_URL` can already read and write every user's rows, so the
  operator is the trust boundary. Resolving `--user` from an email needs a
  `postgres`-role URL (`DATABASE_ADMIN_URL`), since `app_runtime` cannot read
  `auth.users`.
- Parsing and mapping are pure functions; `--dry-run` uses only them and opens
  no database connection.
- Idempotency keys are `notion:expense:<hash of the raw row>:<rank among
  identical rows>` and `notion:income:<YYYY-MM>:<seed key>`. The rank, rather
  than the row's position in the file, keeps keys stable when a newer export
  adds or reorders rows, while two identical purchases still get two keys.
  References (the account "Notion history", the beneficiary Children,
  categories) are looked up by name before being created.
- Category names stay the user's French ones (`Bouffe`, not the seeded
  `Groceries`); a category of the same name (case-insensitive) in the same
  group is reused. Rows without a sub-category go to "À classer" in Daily
  life (ADR 0009's "Unsorted", named in the user's language).
- `Dépenses générales` always maps to Daily life; the group of an `Enfants`
  row comes from an explicit sub-category table in
  `apps/api/src/import-notion/mapping.ts`. A sub-category missing from it
  goes to Daily life and is reported. An unknown `Catégorie` is skipped and
  reported. Which sub-categories make a non-`Enfants` row the children's
  (ADR 0010) is not in the code: each is passed with the repeatable
  `--children-sub-category <name>`, none by default.
- The summary names months without a year: years start at
  `--summary-start-year` (default: the year of the oldest expense) and move
  on each time the month does not move forward. Notion's `DEPENSES` column is
  only printed next to the imported monthly total, as a cross-check.
- `Carte` is not imported (cashback-eligible comes from the account); the
  number of rows that had it is reported.

## Consequences

- A re-run of the same or a newer export adds only new rows. Editing a row in
  Notion and re-importing records it again (new hash); the old one has to be
  deleted by hand.
- Sub-categories that exist under several Notion parents (`Cadeaux`,
  `Abonnements`…) become one category per group, which the user can merge
  later with `transactions.update`.
