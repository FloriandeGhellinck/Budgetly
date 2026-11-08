import type { Tx } from "@expense/db";
import { sql, type SQL } from "drizzle-orm";
import type { MonthTotals } from "./figures.ts";

// Every row the reports count, one per transaction, with the caller's part
// already computed (ADR 0029):
// - live expenses and incomes only: transfer legs and deleted rows never count;
// - income on a shared account (share < 100 %) is ignored (ADR 0023);
// - part = amount × share, rounded half up per transaction in integer cents,
//   so any grouping of the rows adds up to the same totals;
// - bucket: income, saving (expense in a saving group) or spending (any other
//   expense, uncategorized included).
// `where` narrows it further, on the `t` (transactions), `c` and `g` aliases.
function counted(userId: string, where: SQL = sql``) {
  return sql`
    select
      t.id,
      t.occurred_on,
      t.direction,
      (t.amount_minor::bigint * a.share_bps + 5000) / 10000 as part,
      case
        when t.direction = 'income' then 'income'
        when g.kind = 'saving' then 'saving'
        else 'spending'
      end as bucket,
      g.id as group_id,
      g.name as group_name,
      g.kind as group_kind,
      g.sort_order as group_sort,
      c.id as category_id,
      c.name as category_name
    from transactions t
    join accounts a on a.user_id = t.user_id and a.id = t.account_id
    left join categories c on c.user_id = t.user_id and c.id = t.category_id
    left join category_groups g on g.user_id = c.user_id and g.id = c.group_id
    where t.user_id = ${userId}
      and t.deleted_at is null
      and (t.direction = 'expense' or (t.direction = 'income' and a.share_bps = 10000))
      ${where}`;
}

// Sums come back from Postgres as bigint strings.
const toInt = (value: string | number | null) => Number(value ?? 0);

// Income, spending and saving per month from `from` to `to` (YYYY-MM,
// inclusive), months without transactions included as zeros.
export async function monthlyTotals(
  tx: Tx,
  userId: string,
  from: string,
  to: string,
): Promise<(MonthTotals & { month: string })[]> {
  const first = `${from}-01`;
  const last = `${to}-01`;
  const rows = await tx.execute<{
    month: string;
    income: string;
    spending: string;
    saving: string;
  }>(sql`
    with rows as (${counted(
      userId,
      sql`and t.occurred_on >= ${first}::date
          and t.occurred_on < (${last}::date + interval '1 month')`,
    )}),
    months as (
      select generate_series(${first}::date, ${last}::date, interval '1 month')::date as start
    )
    select
      to_char(m.start, 'YYYY-MM') as month,
      coalesce(sum(r.part) filter (where r.bucket = 'income'), 0) as income,
      coalesce(sum(r.part) filter (where r.bucket = 'spending'), 0) as spending,
      coalesce(sum(r.part) filter (where r.bucket = 'saving'), 0) as saving
    from months m
    left join rows r on date_trunc('month', r.occurred_on)::date = m.start
    group by m.start
    order by m.start`);
  return rows.map((row) => ({
    month: row.month,
    incomeMinor: toInt(row.income),
    spendingMinor: toInt(row.spending),
    savingMinor: toInt(row.saving),
  }));
}

export type CategoryTotal = {
  direction: "expense" | "income";
  groupId: string | null;
  groupName: string | null;
  groupKind: "spending" | "saving" | null;
  groupSort: number | null;
  categoryId: string | null;
  categoryName: string | null;
  totalMinor: number;
  count: number;
  firstOn: string;
  lastOn: string;
};

async function categoryTotals(tx: Tx, userId: string, where: SQL): Promise<CategoryTotal[]> {
  const rows = await tx.execute<{
    direction: "expense" | "income";
    group_id: string | null;
    group_name: string | null;
    group_kind: "spending" | "saving" | null;
    group_sort: number | null;
    category_id: string | null;
    category_name: string | null;
    total: string;
    count: string;
    first_on: string;
    last_on: string;
  }>(sql`
    with rows as (${counted(userId, where)})
    select
      direction, group_id, group_name, group_kind, group_sort, category_id, category_name,
      sum(part) as total,
      count(*) as count,
      to_char(min(occurred_on), 'YYYY-MM-DD') as first_on,
      to_char(max(occurred_on), 'YYYY-MM-DD') as last_on
    from rows
    group by direction, group_id, group_name, group_kind, group_sort, category_id, category_name`);
  return rows.map((row) => ({
    direction: row.direction,
    groupId: row.group_id,
    groupName: row.group_name,
    groupKind: row.group_kind,
    groupSort: row.group_sort,
    categoryId: row.category_id,
    categoryName: row.category_name,
    totalMinor: toInt(row.total),
    count: toInt(row.count),
    firstOn: row.first_on,
    lastOn: row.last_on,
  }));
}

export type BreakdownFilters = {
  from: string;
  to: string;
  direction: "expense" | "income";
  beneficiaryId?: string | undefined;
  groupId?: string | undefined;
};

export function breakdownTotals(
  tx: Tx,
  userId: string,
  filters: BreakdownFilters,
): Promise<CategoryTotal[]> {
  return categoryTotals(
    tx,
    userId,
    sql`and t.direction = ${filters.direction}
      and t.occurred_on between ${filters.from}::date and ${filters.to}::date
      ${filters.beneficiaryId ? sql`and t.beneficiary_id = ${filters.beneficiaryId}` : sql``}
      ${filters.groupId ? sql`and g.id = ${filters.groupId}` : sql``}`,
  );
}

export function tagTotals(tx: Tx, userId: string, tagId: string): Promise<CategoryTotal[]> {
  return categoryTotals(
    tx,
    userId,
    sql`and exists (
      select 1 from transaction_tags tt
      where tt.user_id = t.user_id and tt.transaction_id = t.id and tt.tag_id = ${tagId})`,
  );
}

export async function findTag(
  tx: Tx,
  userId: string,
  by: { tagId: string } | { tagName: string },
): Promise<{ id: string; name: string } | undefined> {
  const match = "tagId" in by ? sql`id = ${by.tagId}` : sql`lower(name) = lower(${by.tagName})`;
  const [row] = await tx.execute<{ id: string; name: string }>(
    sql`select id, name from tags where user_id = ${userId} and ${match}`,
  );
  return row;
}

export type AccountBalance = {
  accountId: string;
  name: string;
  currency: string;
  shareBps: number;
  archivedAt: string | null;
  balanceMinor: number;
};

// Real amounts, not the caller's part: a balance is what the account holds.
export async function accountBalances(
  tx: Tx,
  userId: string,
  asOf: string | undefined,
): Promise<AccountBalance[]> {
  const rows = await tx.execute<{
    id: string;
    name: string;
    currency: string;
    share_bps: number;
    archived_at: string | null;
    balance: string;
  }>(sql`
    select
      a.id, a.name, a.currency, a.share_bps,
      to_char(a.archived_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as archived_at,
      coalesce(sum(
        case when t.direction in ('income', 'transfer_in') then t.amount_minor::bigint
             else -t.amount_minor::bigint end
      ), 0) as balance
    from accounts a
    left join transactions t
      on t.user_id = a.user_id and t.account_id = a.id and t.deleted_at is null
      ${asOf ? sql`and t.occurred_on <= ${asOf}::date` : sql``}
    where a.user_id = ${userId}
    group by a.id
    order by a.archived_at is not null, a.name, a.id`);
  return rows.map((row) => ({
    accountId: row.id,
    name: row.name,
    currency: row.currency,
    shareBps: row.share_bps,
    archivedAt: row.archived_at,
    balanceMinor: toInt(row.balance),
  }));
}

export type Flow = {
  fromAccountId: string;
  toAccountId: string;
  sentMinor: number;
  receivedMinor: number;
  count: number;
};

// Live transfers summed per from → to pair; both legs share one date.
export async function transferFlows(
  tx: Tx,
  userId: string,
  period: { from?: string | undefined; to?: string | undefined },
): Promise<Flow[]> {
  const rows = await tx.execute<{
    from_account_id: string;
    to_account_id: string;
    sent: string;
    received: string;
    count: string;
  }>(sql`
    select
      o.account_id as from_account_id,
      i.account_id as to_account_id,
      sum(o.amount_minor) as sent,
      sum(i.amount_minor) as received,
      count(*) as count
    from transactions o
    join transactions i
      on i.user_id = o.user_id and i.transfer_id = o.transfer_id and i.direction = 'transfer_in'
    where o.user_id = ${userId}
      and o.direction = 'transfer_out'
      and o.deleted_at is null
      and i.deleted_at is null
      ${period.from ? sql`and o.occurred_on >= ${period.from}::date` : sql``}
      ${period.to ? sql`and o.occurred_on <= ${period.to}::date` : sql``}
    group by o.account_id, i.account_id
    order by sum(o.amount_minor) desc, o.account_id, i.account_id`);
  return rows.map((row) => ({
    fromAccountId: row.from_account_id,
    toAccountId: row.to_account_id,
    sentMinor: toInt(row.sent),
    receivedMinor: toInt(row.received),
    count: toInt(row.count),
  }));
}
