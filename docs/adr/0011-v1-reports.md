# 11. v1 reports

Status: accepted (2026-11-07)

## Decision

v1 ships five reports, each exposed both in the UI and as an oRPC procedure
(so agents can ask the same questions over MCP):

1. **Month overview**: income, spending, saving, net, savings rate, vs
   previous month.
2. **12-month trend**: income / spending / saving per month.
3. **Breakdown**: by category group and category, filterable by beneficiary.
4. **Tag view**: total and per-category breakdown of a tag (event, trip).
5. **Account balances** and flows between accounts.

Deferred to v2: budgets (targets per group/category) and recurring
transactions (subscriptions, direct debits). Each adds a new domain concept.
