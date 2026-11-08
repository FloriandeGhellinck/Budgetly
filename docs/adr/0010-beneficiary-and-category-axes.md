# 10. Two axes: beneficiary ("for whom") and category ("for what")

Status: accepted (2026-11-07)

## Context

The Notion `Catégorie` column mixed two questions: who the money is for
(`Enfants`, `Dépenses générales` = the author) and what kind of spending it is
(`Loisirs`, `Investissement`, `Dettes`). A trip with the kids had to be filed
either under "Enfants" or under "Loisirs". Sub-categories (Bouffe, Soins…)
were repeated under several parents.

## Decision

Each transaction has two independent classifications:

- **Beneficiary** — who the money is for: `Me`, `Children` (later possibly
  each child or the partner individually).
- **Category** — what it is for, belonging to a **category group**: e.g.
  Daily life (Groceries, Health, Clothing, Furniture, Childcare…), Leisure
  (Holidays, Outings, Gifts, Sport, Lottery…), Investment (Stocks, Crypto,
  Real estate, Invest Child A, Invest Child B), Debt (Loan repayment).

The `kind` (`spending` | `saving`, ADR 0004) is set on the category group.

Exactly two levels: group → category. No deeper hierarchy. Finer grouping
across categories uses **tags** (free-form, several per transaction, created
on the fly), e.g. "Summer trip 2026", "Baby shower". The Notion
`Type` column imports as tags.

## Consequences

- "How much do the children cost?" = filter by beneficiary, all categories.
- "How much on leisure?" = filter by group, all beneficiaries.
- The Notion import maps `Enfants` → beneficiary Children, `Dépenses
  générales` → Me, and `Loisirs` / `Investissement` / `Dettes` → category
  groups (beneficiary Me unless the sub-category says otherwise, e.g.
  Invest Child A / Invest Child B → Children).
