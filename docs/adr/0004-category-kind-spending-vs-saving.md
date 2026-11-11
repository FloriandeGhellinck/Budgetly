# 4. Category kind separates spending from saving

Status: accepted (2026-11-07)

## Context

Investments (stocks, crypto, real estate, children's savings) were logged as
expenses, which makes the savings rate look worse than it is.

## Decision

Each category group has a `kind` (originally per category, moved to the group by ADR 0010): `spending` or `saving`. Saving transactions are
still `expense` transactions (money leaves the account), but dashboards
report consumption and saving separately. Loan repayments are `spending`.

A full account / net-worth model may come later and must not break this.

## Consequences

- Savings rate = saving / income, computed per period.
