# 25. v1 operational defaults

Status: accepted (2026-11-08)

## Decision

1. **GDPR**: users can export all their data as CSV and delete their account
   from v1.
2. **Environments**: local Supabase (`supabase start`) for development,
   Vercel preview deployments per PR, `main` deploys to production. No
   staging environment while the project has a single maintainer.
3. **Soft delete** for transactions (`deletedAt`) so mistakes by the user or
   an agent can be undone. No full audit log in v1.
4. **Repository**: public GitHub repo `budgetly` with README, `LICENSE`
   (AGPL-3.0) and a minimal `CONTRIBUTING.md`.
