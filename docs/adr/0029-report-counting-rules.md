# 29. Report counting: per-transaction rounding, uncategorized is spending, relative balances

Status: accepted (2026-11-08)

## Context

The five v1 reports (ADR 0011) weight every amount by its account's share
(ADR 0023, 0026). Weighting odd cents needs a rounding rule, the schema allows
expenses without a category, a savings rate is a ratio, and accounts have no
opening balance. Each report must give the same figure for the same money.

## Decision

- **My part is rounded per transaction**, half up, in integers:
  `(amount_minor * share_bps + 5000) / 10000`, then summed. Every grouping of
  the same transactions (month, group, category, tag) adds up to the same
  total, and a transaction's part is the same in every report. Rounding the
  sum instead would make category totals disagree with group and month
  totals. The cost is a small upward bias on odd cents at 50 % (at most half
  a cent per transaction).
- **Counted rows** are live `expense` and `income` transactions. Income on a
  shared account (`share_bps < 10000`) is ignored (ADR 0023); personal income
  counts in full. Transfer legs never count.
- **An expense without a category is spending**: money consumed unless the
  user filed it as saving. Breakdowns show it as a bucket with null ids.
- **Savings rate** is returned as `savingsRateBps` (integer basis points,
  rounded half up), null when income is 0, like `shareBps` (ADR 0027).
  Net and changes between months are signed integer cents (`netMinor`).
- **Aggregation runs in SQL** (`GROUP BY`, `generate_series` for empty
  months); the API only shapes the grouped rows.
- **Balances are relative**: there is no opening balance. An account's
  balance is the real-amount net of its recorded live transactions (income
  and incoming transfers add, expenses and outgoing transfers subtract) up to
  `asOf`. It matches the bank only if recording started from zero. An opening
  balance (amount + date per account) is deferred until the UI needs bank
  figures; it will add to this sum without changing the counting rules.

## Consequences

- `reports.breakdown` totals for a month equal that month's spending plus
  saving in `reports.monthOverview` (tested).
- Changing a share re-weights past months (as `accounts.update` already says).
