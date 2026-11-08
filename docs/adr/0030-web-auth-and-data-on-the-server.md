# 30. apps/web: auth and data calls run on the server only

Status: accepted (2026-11-08). Amended by ADR 0032 (the API checks `aal`).

## Context

ADR 0014 keeps the session in httpOnly cookies and the oRPC client off the
browser. Building `apps/web` had to settle what that means for Supabase Auth
calls, for server actions, for the first sign-in and for MFA.

## Decision

- **No browser Supabase client.** `@supabase/ssr` writes its cookies with
  `httpOnly: true`, so page JavaScript cannot read them, and every auth call
  (magic link, Google, verify, sign out, TOTP enrol and verify) runs in a
  server action or route handler. Only `src/lib/supabase` creates clients
  (oxlint); no `NEXT_PUBLIC_` variable exists.
- **Magic link with a token hash.** The email links to `/auth/confirm`,
  which calls `verifyOtp` server-side; Google returns a PKCE code to
  `/auth/callback`. `supabase/templates/magic-link.html` holds the link.
- **One server-only API client.** `src/lib/api/server.ts` (`getApi`, cached
  per request) forwards the access token to `apps/api`. Server actions call
  it through `runAction`, which returns an `ActionResult`: declared API
  errors keep their code (ADR 0027) for the UI to translate, a rejected
  session redirects to `/login`. A `"use client"` file importing a module
  that imports `server-only` fails `pnpm boundaries`.
- **Session checks.** `proxy.ts` refreshes the session on every request and
  redirects signed-out visitors (`getClaims`, verified against the JWKS).
  The `(app)` layout checks again with `requireUser`: a session below `aal2`
  costs one `getUser` call, to learn whether the user has a verified TOTP
  factor and must pass `/login/mfa`.
- **Bootstrap at sign-in.** `/auth/confirm` and `/auth/callback` call
  `me.bootstrap` with the new token. If that fails, the layout's option
  loader calls it again when the user has no account at all.
- **Writes revalidate the whole app** (`revalidatePath("/", "layout")`):
  lists, figures and form options all depend on transactions.

## Consequences

- An XSS cannot read the token, but every auth interaction is a server round
  trip; no client-side `onAuthStateChange`.
- `apps/api` does not yet check `aal`: a user with TOTP who signs in by
  magic link only is stopped by the web app, not by the API. Enforcing it in
  the API needs the user's factors there (follow-up).
- A future screen reads data in a server component with `getApi()` and
  writes through a server action in `src/lib/<area>/actions.ts`.
