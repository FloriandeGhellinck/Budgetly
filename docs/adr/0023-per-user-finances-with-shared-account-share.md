# 23. Each user tracks their own finances; shared accounts carry the user's share

Status: accepted (2026-11-08). Supersedes ADR 0008; amends ADR 0012 and 0021.

## Context

ADR 0008 and 0012 modelled a household with several members and users who
could all see every account. In practice a partner must not see the author's
personal accounts, and the only real need is: "expenses on the joint account
count for me at 50 %".

## Decision

- The tenant is the **user**. Every domain row (accounts, transactions,
  categories, tags, beneficiaries) belongs to exactly one user, and only that
  user can see it. There is no household and no member entity.
- An account can be marked **shared** with the user's **share** (e.g. Joint
  account: 50 %). Personal accounts are 100 %.
- Transactions are recorded at their **real amount**. Reports weight each
  transaction by the share of its account ("my part"); account balances use
  real amounts.
- If the partner uses the app, they have their own, fully separate space.
- **Inflows to a shared account are ignored by reports.** Example month: the
  user moves 1,000 € from their personal account to the joint account (a
  plain transfer), the partner deposits 1,000 € from an untracked account,
  and 1,800 € of expenses leave the joint account. Reports show 900 € of
  spending (1,800 × 50 %) and no income from either deposit. The joint
  account balance stays the real bank balance.
- No "who owes whom" tracking: if one person contributes more than their
  share over time, the app does not flag it (v1).

## Consequences

- Tenant isolation = `user_id` on every row, enforced by API checks and RLS.
- No invitations, roles or membership management.
- The Notion import (ADR 0009) still works: legacy account at 100 %.
