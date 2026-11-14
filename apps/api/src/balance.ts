import { type SQL, sql } from "drizzle-orm";

// One definition of an account's balance for accounts.* and reports.accounts
// (ADR 0029, 0035). `account` is the table name or alias the outer query uses;
// the columns are spelled out because Drizzle renders them unqualified in `sql`.

// Real-amount net of the account's live transactions dated up to `upTo`
// (a date expression; every transaction when omitted), as a bigint.
export function transactionsNet(account: "accounts" | "a", upTo?: SQL): SQL<string> {
  const a = sql.raw(`"${account}"`);
  return sql<string>`(
    select coalesce(sum(
      case when t.direction in ('income', 'transfer_in') then t.amount_minor::bigint
           else -t.amount_minor::bigint end
    ), 0)
    from transactions t
    where t.user_id = ${a}.user_id and t.account_id = ${a}.id and t.deleted_at is null
      ${upTo ? sql`and t.occurred_on <= ${upTo}` : sql``}
  )`;
}

// Opening balance (0 when never set) plus the net up to `upTo`.
export function accountBalance(account: "accounts" | "a", upTo?: SQL): SQL<string> {
  const a = sql.raw(`"${account}"`);
  return sql<string>`(coalesce(${a}.opening_balance_minor, 0) + ${transactionsNet(account, upTo)})`;
}
