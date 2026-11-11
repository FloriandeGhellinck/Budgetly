# 1. Self-hosted, one household per instance

Status: superseded by ADR 0012 (2026-11-08)

## Context

Budgetly is an open-source personal finance tracker (expenses and income).
We had to choose between a self-hosted app, a multi-tenant SaaS, and a
local-first app.

## Decision

One instance serves one **household**. People run it themselves (Docker or
`pnpm start`). No multi-tenancy, no billing, minimal auth.

The schema still carries a `householdId` so that a multi-tenant mode stays
possible later without a data migration.

## Consequences

- SQLite is a viable default database (to be confirmed in a later ADR).
- An agent / MCP client talks to the user's own instance.
- Data isolation between tenants is out of scope for now.
