# 36. Analysis: one view object, one report procedure

Status: accepted (2026-11-16)

## Context

The Analysis page lets the user slice their money freely: period, types,
groups, categories, beneficiaries, accounts, tags and text, grouped six ways,
with a comparison. `reports.breakdown` (ADR 0011) filters on one direction,
one group and one beneficiary and only groups by group and category. Saved
views will later store what the page shows, and agents should be able to ask
the same questions.

## Decision

- **One read-only procedure, `reports.analysis`**, takes the filters, a plain
  `from`/`to`, a `groupBy` and an optional `compare` range, and returns
  items, the total, the per-type split and the compare range's total. It
  counts with ADR 0029's rules in SQL, reusing the same counted rows as the
  other reports; a test proves it adds up like `reports.breakdown`. One
  filter fragment serves items, split and comparison, so they cannot drift.
- **Types are report figures** (income, spending, saving), not directions or
  group kinds: uncategorized expenses are spending, as everywhere else.
- **The Analysis view** (`AnalysisView` in `packages/contract`) is the one
  schema for what the page shows: filters, period, group-by, display and
  comparison mode. A period is either a relative preset (this month, last 12
  months…) or fixed days. The web keeps the view in the URL; saved views will
  store the same object.
- **Presets resolve outside the API** (`resolvePeriod`, `comparisonRange` in
  the contract, given today's date in the user's time zone), so the procedure
  only sees days and an agent can pass any range.
- **One API call per change.** The page asks only `reports.analysis`;
  names, colours and filter options come from the entry options the `(app)`
  layout already loads on the server (ADR 0030) and hands to the client,
  which a search-param change does not re-run. Controls update optimistically
  and multi-select chips apply when their popover closes.
- **Grouped by tag**, a transaction with several tags counts under each; the
  total and split still count it once.

## Consequences

- A new filter or grouping is a contract field plus a clause in one SQL
  fragment. The transactions page takes several groups or categories but one
  beneficiary, account and tag, and a direction, so links from Analysis
  carry only what it understands: spending without saving, or several
  beneficiaries, accounts or tags, open a wider list than the figure.
- Saved views (slice 2) need a table holding an `AnalysisView` as JSON and a
  name; no change to the procedure.
