# 35. Opening balance: a signed offset per account, derived from the bank's figure

Status: accepted (2026-11-14). Amends ADR 0029 (relative balances).

## Context

ADR 0029 made balances relative: the net of the transactions recorded on an
account, which matches the bank only if recording started from zero. Users
start mid-life, import partial history (ADR 0009) and want the Accounts
screen to show what their bank shows. ADR 0029 deferred an opening balance
"until the UI needs bank figures"; it needs them now.

## Decision

- **Each account may carry an opening balance**: `opening_balance_minor` and
  `opening_balance_on` on `accounts`, both null or both set (CHECK
  `accounts_opening_balance_pair`). No new table, so the existing RLS policy
  and composite keys already cover it.
- **The user types the bank's figure, the API derives the opening balance.**
  `accounts.setBalance({ id, balanceMinor, asOf })` stores
  `opening = balanceMinor − net(live transactions dated ≤ asOf)` and
  `opening_balance_on = asOf`. The figure is the balance at the **end** of
  `asOf`: every transaction dated that day or earlier is assumed included.
- **Balance rule**: the balance at the end of day D is
  `opening + net(live transactions dated ≤ D)`, where net is income and
  incoming transfers minus expenses and outgoing transfers, at real amounts.
  Without an opening balance the term is 0 and the balance stays relative,
  as before. `accounts.list` returns the current balance (every live
  transaction), `reports.accounts` the balance at `asOf`. Both use one SQL
  definition (`apps/api/src/balance.ts`).
- **The opening balance is an offset, not an anchor.** We store what the
  account held before its first recorded transaction rather than the typed
  figure. A transaction entered later on the adjusted day moves the balance,
  which is what users expect right after adjusting. The cost: adding,
  editing or deleting a transaction dated on or before `asOf` also moves the
  balance away from the bank's figure; adjusting again recomputes the
  opening balance. `opening_balance_on` records which figure it came from.
- **Not a transaction.** It never enters `transactions`, so reports, the
  savings rate, "my part" and the dashboards (ADR 0029) cannot count it.
- **Shared accounts** take the account's full bank balance; balances are
  never weighted by share (ADR 0023).
- **Signed cents, here only.** A balance is a level, not a movement, so it
  has no direction to carry its sign, and an overdraft is negative. Balances
  already leave the API as signed `balanceMinor` (ADR 0029); storing the
  opening balance the same way keeps the sum one addition. Transactions keep
  positive `amount_minor` plus `direction` (ADR 0003, 0006). The column is a
  `bigint`, since the offset can exceed a typed figure; inputs are bounded to
  ±10 billion euros.
- **No idempotency key**: the call sets state rather than adding money, so
  repeating it with the same figure leaves the same opening balance (ADR 0027
  keeps keys for `transactions.create` and `transfers.create`).
- **The day is required in the API**: the server runs in UTC, so "today"
  comes from the caller. The web dialog defaults it to the user's local day.

## Consequences

- The Accounts screen labels accounts without an opening balance as
  relative and offers "Adjust balance" on every account.
- There is no way to remove an opening balance yet; adjusting again replaces
  it.
- The web parses a signed balance with `parseBalanceMinor`, next to the
  positive-only `parseAmountMinor`.
