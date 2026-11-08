# 12. Public multi-household app on Supabase

Status: accepted (2026-11-08). Supersedes ADR 0001. Tenant amended by ADR 0023.

## Context

The goal is now a public app: anyone can sign up and track their own
household's finances, while the code stays open source.

## Decision

- The app is multi-tenant. The **household** is the tenant: every
  domain row belongs to exactly one household.
- Users sign up with an account and belong to one or more households (e.g.
  the author and their partner share one household).
- Supabase provides the Postgres database and authentication.

## Consequences

- Tenant isolation is a core security requirement (every query is scoped
  to a household).
- Invitations / membership management are needed (partner joins household).
- Data protection (GDPR) applies to the hosted instance.
- How the app talks to Supabase (directly from the browser vs only through the
  oRPC server) is decided separately.
