# 32. apps/api enforces MFA: aal2 for users with a verified factor

Status: accepted (2026-11-08). Amends ADR 0030.

## Context

ADR 0030 left a gap: the web app sends a TOTP user to `/login/mfa` after a
magic link, but `apps/api` accepted their `aal1` token, so anyone holding that
token (an agent, a script, a leaked cookie) could skip the second factor. The
API has to know two things per call: the session's assurance level and
whether the user has a verified factor.

Supabase puts the level in the access token (`aal`, absent means `aal1`) and
the methods used in `amr`. Nothing in the token says whether the user has
enrolled a factor; Supabase's own "enforce for users who opted in" RLS recipe
reads `auth.mfa_factors` (`status = 'verified'`). `app_runtime` has no access
to the `auth` schema (ADR 0026), and `auth.mfa_factors` has RLS on with no
policy.

Options considered:

- **Custom access token hook** adding a "has factor" claim: one more piece of
  Supabase configuration per project, and the claim is stale until the next
  token refresh after enrolment or removal.
- **Auth admin API** (`GET /auth/v1/admin/users/:id`) per call: a network
  round trip and a service-role secret in `apps/api`.
- **A narrowly granted SQL function**: one indexed lookup in the call's own
  transaction, no secret, always current.

## Decision

- Migration `*_mfa_factor_check.sql` creates
  `private.current_user_has_verified_factor()`: `security definer`, owned by
  the migration role (`postgres`, which can read `auth.mfa_factors` and
  bypasses RLS on it), `search_path = ''`, no argument. It reads the user from
  `app.current_user_id`, the RLS binding `withUser` sets, so a caller can only
  ask about themselves. Execute is revoked from `public`, `anon` and
  `authenticated` and granted to `app_runtime` only; the `private` schema is
  not exposed by PostgREST.
- The token verifier returns `{ userId, aal }`. Inside `withUser`, before the
  handler, a token below `aal2` triggers the lookup; a verified factor means
  the call fails with `MFA_REQUIRED` (403, a declared code in
  `packages/contract/src/errors.ts` whose message tells an agent to complete
  the TOTP challenge and retry with the new token). `aal2` tokens skip the
  lookup. Unverified factors (an enrolment never confirmed) do not count.
- `apps/web`'s `runAction` turns `MFA_REQUIRED` into a redirect to
  `/login/mfa`. The sign-in bootstrap ignores it: the layout retries after the
  second factor.

## Consequences

- Calls at `aal1` cost one extra indexed query; MFA users at `aal2` none.
- Removing the last factor takes effect on the next call, without waiting for
  a token refresh.
- Tests stub `auth.mfa_factors` (`@expense/test-db`) and sign tokens with and
  without `aal` (`apps/api/src/mfa.db.test.ts`). They run migrations as a true
  superuser, so they cannot catch a hosted project where `postgres` loses
  read access or RLS bypass on `auth.mfa_factors`; this was checked by hand on
  the local Supabase stack (the function returns true as `app_runtime` for a
  user with a verified factor) and must be re-checked on the hosted project
  at first deploy. If `postgres` cannot read the table there, the function
  returns false for everyone and MFA is silently not enforced by the API.
