-- Row-level security (ADR 0013, 0026). apps/api connects as app_runtime, a
-- login role that is neither superuser nor BYPASSRLS, and runs each call in a
-- transaction that sets app.current_user_id (withUser in @expense/db).

-- Created without a password so this runs everywhere; the password is set out
-- of band. Roles are cluster-wide: test databases sharing a server race here.
do $$
begin
  create role app_runtime with login nosuperuser nocreatedb nocreaterole noreplication noinherit nobypassrls;
exception
  when duplicate_object or unique_violation then null;
end
$$;

grant usage on schema public to app_runtime;
grant select, insert, update, delete on all tables in schema public to app_runtime;
grant usage, select on all sequences in schema public to app_runtime;
-- Tables added by later migrations get the same grants without ceremony.
alter default privileges in schema public grant select, insert, update, delete on tables to app_runtime;
alter default privileges in schema public grant usage, select on sequences to app_runtime;

-- The browser never queries data through PostgREST (ADR 0013): Supabase's API
-- roles get nothing in public.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- One owner policy per table. nullif: a custom setting reads back as '' once a
-- transaction that set it has ended, and ''::uuid would throw instead of deny.
-- The scalar subquery is evaluated once per statement, not once per row.

alter table public.accounts enable row level security;
alter table public.accounts force row level security;
create policy accounts_owner on public.accounts for all to app_runtime
  using (user_id = (select nullif(current_setting('app.current_user_id', true), '')::uuid))
  with check (user_id = (select nullif(current_setting('app.current_user_id', true), '')::uuid));

alter table public.category_groups enable row level security;
alter table public.category_groups force row level security;
create policy category_groups_owner on public.category_groups for all to app_runtime
  using (user_id = (select nullif(current_setting('app.current_user_id', true), '')::uuid))
  with check (user_id = (select nullif(current_setting('app.current_user_id', true), '')::uuid));

alter table public.categories enable row level security;
alter table public.categories force row level security;
create policy categories_owner on public.categories for all to app_runtime
  using (user_id = (select nullif(current_setting('app.current_user_id', true), '')::uuid))
  with check (user_id = (select nullif(current_setting('app.current_user_id', true), '')::uuid));

alter table public.beneficiaries enable row level security;
alter table public.beneficiaries force row level security;
create policy beneficiaries_owner on public.beneficiaries for all to app_runtime
  using (user_id = (select nullif(current_setting('app.current_user_id', true), '')::uuid))
  with check (user_id = (select nullif(current_setting('app.current_user_id', true), '')::uuid));

alter table public.tags enable row level security;
alter table public.tags force row level security;
create policy tags_owner on public.tags for all to app_runtime
  using (user_id = (select nullif(current_setting('app.current_user_id', true), '')::uuid))
  with check (user_id = (select nullif(current_setting('app.current_user_id', true), '')::uuid));

alter table public.transactions enable row level security;
alter table public.transactions force row level security;
create policy transactions_owner on public.transactions for all to app_runtime
  using (user_id = (select nullif(current_setting('app.current_user_id', true), '')::uuid))
  with check (user_id = (select nullif(current_setting('app.current_user_id', true), '')::uuid));

alter table public.transaction_tags enable row level security;
alter table public.transaction_tags force row level security;
create policy transaction_tags_owner on public.transaction_tags for all to app_runtime
  using (user_id = (select nullif(current_setting('app.current_user_id', true), '')::uuid))
  with check (user_id = (select nullif(current_setting('app.current_user_id', true), '')::uuid));
