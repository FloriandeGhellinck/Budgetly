# 7. Tracked accounts boundary

Status: accepted (2026-11-07)

## Context

Some money goes to places whose inner activity is not worth logging by hand,
e.g. a top-up sent to a crypto exchange then spent in small daily buys, or monthly
contributions to the children's investments.

## Decision

- Only **tracked accounts** are modelled: where day-to-day money lives and
  spending happens.
- Money leaving a tracked account to anything outside the boundary is an
  `expense`; if it is set aside (investing, kids' savings) its category is of
  kind `saving` (ADR 0004).
- Money entering a tracked account from outside is `income`.
- Movements between two tracked accounts are transfers (ADR 0005/0006).
- What happens inside untracked places (exchange buys, portfolio moves) is not
  recorded. A future net-worth module may turn them into investment accounts.

Example tracked accounts for a household: Personal account, Joint account,
Card account, Crypto card (EURC), meal vouchers, eco vouchers.

## Consequences

- An exchange top-up is one transaction, not dozens.
- Meal/eco vouchers are income on their own account and spending from it.
