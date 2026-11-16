# 38. Production migrations run from GitHub Actions on merge to main

Status: accepted (2026-11-16)

## Context

Production migrations were applied by hand with `supabase db push` from a
linked checkout. Merging the saved views (ADR 0037) shipped code that needs a
new table before anyone had pushed the migration, so the page would have
failed in production until someone remembered.

## Decision

- **A `Migrate production` workflow** runs `supabase db push --remote` when a
  push to `main` changes `supabase/migrations/`, and on demand
  (`workflow_dispatch`) to retry.
- It does not wait for CI on `main`: the migrations already ran against a
  throwaway database in the pull request's CI, and waiting would leave new
  code on the old schema for the length of a full test run.
- **Credentials**: a Supabase personal access token
  (`SUPABASE_ACCESS_TOKEN` secret) and the project ref
  (`SUPABASE_PROJECT_REF` variable), in the `production` environment so
  approvals can be added later. The CLI connects through a temporary login
  role, so no database password is stored.
- Runs share one concurrency group and are never cancelled halfway.

## Consequences

- Vercel deploys and the migration start from the same push, so for about a
  minute old code can meet the new schema or new code the old one.
  Migrations stay backward compatible: add before use, stop using before
  dropping.
- A failed run leaves production on the old schema; the Actions tab shows it,
  and the workflow can be re-run after a fix.
