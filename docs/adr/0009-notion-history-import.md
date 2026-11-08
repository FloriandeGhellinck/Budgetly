# 9. Import Notion history as-is into a legacy account

Status: accepted (2026-11-07)

## Context

~1,420 expense rows (Oct 2025 – Nov 2026) and a monthly income summary exist
in Notion. They lack the account of each row, and joint expenses may already
be entered at the author's share.

## Decision

- A one-off import script loads all rows into a single legacy account
  "Notion history", owned 100 % by the author. Amounts are kept as-is, so the
  author's past figures are unchanged.
- Monthly income lines (salary, meal vouchers, other) become one `income`
  transaction per month and type, dated the 1st of the month.
- Rows without category go to an "Unsorted" category; empty rows are dropped.
- Investment rows land in categories of kind `saving` (ADR 0004), debt
  repayments in `spending`.
- The real model (real accounts, real amounts, shares) starts at the cut-over
  date. No reinterpretation of history.

## Consequences

- Dashboards have a year of history from day one.
- Household-view figures before cut-over reflect the author's share only.
