# 14. Next.js web app in front of a separate oRPC API

Status: accepted (2026-11-08)

## Context

The data is confidential financial information. Options were a Vite SPA
calling the API from the browser, or a Next.js app calling the API from its
server (the Titan pattern).

## Decision

- `apps/web` is a **Next.js** (App Router) app. Supabase auth uses
  **httpOnly cookies** (`@supabase/ssr`), so page JavaScript can never read
  the session token.
- `apps/api` is a separate **Hono + oRPC** server. Next calls it **only from
  the server** (server components, server actions), forwarding the user's
  token. No oRPC client ships to the browser.
- The API also serves the **MCP endpoint**; agents call it directly with their
  own OAuth tokens and go through the same checks and procedures.
- A shared **contract package** describes every procedure; web and api import
  it for end-to-end types.

## Consequences

- A script injected in the page cannot steal the session token.
- Two server deployments (web + api).
- Filters live in the URL so server components can render them; client-side
  interactivity is added where it pays off.
