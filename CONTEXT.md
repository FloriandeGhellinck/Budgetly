# Domain glossary

Canonical vocabulary for `expense`. Code, API procedures, MCP tools and docs
use these terms. Decisions live in `docs/adr/`.

## User

The tenant. A person with a login who owns all of their data (accounts,
transactions, categories, tags). Users never see each other's data
(ADR 0023).

## Transaction

A single money movement recorded by the user: one purchase, one salary
payment, one investment contribution. Every expense and every income is a
transaction; there is no separate income table and no hand-entered monthly
total. Monthly summaries are computed from transactions.

## Direction

Whether a transaction takes money out (`expense`) or brings money in
(`income`). The two legs of a transfer use `transfer_out` and `transfer_in`
and are excluded from income and spending figures.

## Amount

The absolute value of a transaction, stored as a positive integer in minor
units (cents of EUR, ADR 0006). The sign comes from the
direction, never from the amount. Example: `{ direction: "expense",
amountMinor: 2068 }` is 20.68 € spent. Currency is a label on the account,
not on the transaction.

## Beneficiary

Who a transaction is for ("pour qui"): `Me`, `Children`. Independent of the
category (ADR 0010).

## Category / Category group

What a transaction is for ("pour quoi"). Each category (Groceries, Health)
belongs to a group (Daily life, Leisure, Investment, Debt). Each group has a
direction, `expense` or `income`, and its categories only classify
transactions of that direction: income uses its own group (Income) and
categories (Salary, Meal vouchers…).

## Category kind

Set on the category group: `spending` (money consumed: groceries, childcare, holidays) or `saving`
(money set aside: stocks, crypto, kids' savings). Saving still leaves the
account as an `expense` transaction but is reported apart from spending.

## Account

A place money is held or spent from: the joint bank account (shared), a personal card
account at a broker, a crypto card account paying in EURC. Every transaction
belongs to one account.

## Transfer

Money moving between two accounts of the same user (e.g. joint account
→ broker account). Not spending, not income. Excluded from consumption and
savings-rate figures. Stored as two transaction rows (legs), one per account:
a `transfer_out` leg and a `transfer_in` leg sharing the same `transferId`,
each with its own amount (ADR 0006).

## Cashback-eligible

In the Notion data, `Carte = Oui` means the purchase was paid by card and so
earned cashback; `Non` means card payment was not possible (direct debit,
bank transfer). In `expense` this is derived from the account / payment
method used.

## Tracked account

An account whose movements `expense` records. Anything outside is out of
scope: money sent there is an expense (often of kind `saving`), money coming
from there is income (ADR 0007).

## Shared account / Share

An account the user co-owns with someone else (the joint account). Its
**share** is the user's percentage (50 %). Transactions are recorded at their
real amount; reports count `amount × share` ("my part"). Personal accounts
have a 100 % share.

## My part

The user's share of an amount: `amount × share`, rounded half up to the cent
per transaction (ADR 0029). Every report figure is "my part"; account
balances are not.

## Spending / Saving / Income (report figures)

Spending: "my part" of expenses whose group kind is `spending`, plus
uncategorized expenses. Saving: expenses whose group kind is `saving`.
Income: income on personal accounts; inflows to a shared account are ignored
(ADR 0023). Transfers and deleted transactions never count.

## Net

Income − spending − saving for a period, in signed cents (`netMinor`).

## Savings rate

Saving / income for a period, in basis points (`savingsRateBps`, 2500 =
25 %). Null when there is no income.

## Balance

The real amount an account holds as of a day: income and incoming transfers
minus expenses and outgoing transfers, not weighted by share. Relative for
now: there is no opening balance, so it is the net of what was recorded
(ADR 0029).

## Tag

A free-form label grouping transactions across categories, usually an event
or trip ("Summer trip 2026"). A transaction can have several tags.

## Idempotency key

A string the caller picks for one money write (`transactions.create`,
`transfers.create`). Sending the same key again returns the original
transaction or transfer instead of recording it twice, so an agent or a
flaky network can retry safely (ADR 0027).
