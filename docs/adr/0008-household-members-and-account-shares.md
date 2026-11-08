# 8. Household view with members and account shares

Status: superseded by ADR 0023 (2026-11-08)

## Context

The joint account is fed by both partners; one partner's personal accounts
are not tracked. The Notion setup mixed perspectives: only the author's
salary as income, and joint expenses manually entered at half their amount.

## Decision

- Data is recorded at the **household** level, at real amounts. Nobody types
  "half" amounts any more.
- A household has **members**. Each account has one or more owners with a
  **share** (Joint account: 50 % / 50 %; Personal account: 100 % author).
- Two computed views:
  - **Household view**: all tracked accounts at full value.
  - **Member view** ("me"): each transaction weighted by the member's share of
    its account. Transfers into an account the member co-owns are excluded.
- Shares are fixed per account in v1 (no per-transaction override). A
  nullable per-transaction split may be added later without migration.
- No settlement / "who owes whom" logic in v1.

## Consequences

- The author's current "half" bookkeeping becomes a computed member view.
- Importing Notion history must account for rows already halved.
