-- Saved views are private like every domain row (ADR 0013, 0026, 0036).
alter table public.saved_views enable row level security;--> statement-breakpoint
alter table public.saved_views force row level security;--> statement-breakpoint
create policy saved_views_owner on public.saved_views for all to app_runtime
  using (user_id = (select nullif(current_setting('app.current_user_id', true), '')::uuid))
  with check (user_id = (select nullif(current_setting('app.current_user_id', true), '')::uuid));--> statement-breakpoint
-- The starter views for users who signed up before saved views existed,
-- matching STARTER_VIEWS in seedNewUser. Runs once with this migration, so a
-- user who later deletes them never gets them back.
insert into public.saved_views (user_id, seed_key, name, view, sort_order)
select a.user_id, s.seed_key, s.name, s.view::jsonb, s.sort_order
from (select distinct user_id from public.accounts) a
cross join (values
  ('this_month', 'This month', '{"types":["spending","saving"],"groupIds":[],"categoryIds":[],"beneficiaryIds":[],"accountIds":[],"tagIds":[],"period":{"kind":"relative","preset":"this-month"},"groupBy":"group","display":"donut","compare":"previous-period"}', 0),
  ('spending_per_month', 'Spending per month', '{"types":["spending"],"groupIds":[],"categoryIds":[],"beneficiaryIds":[],"accountIds":[],"tagIds":[],"period":{"kind":"relative","preset":"last-12-months"},"groupBy":"month","display":"bars","compare":"last-year"}', 1),
  ('income_per_month', 'Income per month', '{"types":["income"],"groupIds":[],"categoryIds":[],"beneficiaryIds":[],"accountIds":[],"tagIds":[],"period":{"kind":"relative","preset":"last-12-months"},"groupBy":"month","display":"bars","compare":"last-year"}', 2)
) as s(seed_key, name, view, sort_order)
on conflict (user_id, seed_key) do nothing;
