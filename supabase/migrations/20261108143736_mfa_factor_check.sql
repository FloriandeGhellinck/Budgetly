-- MFA enforcement in apps/api (ADR 0032). The API must refuse an aal1 token
-- from a user who has a verified TOTP factor, but app_runtime has no access
-- to the auth schema. This function answers that one question for the user
-- bound by withUser, and nothing else: it takes no argument, so a caller can
-- only ask about themselves. It runs as its owner (postgres, which can read
-- auth.mfa_factors and bypasses RLS on it).

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to app_runtime;

create function private.current_user_has_verified_factor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.mfa_factors
    where user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
      and status = 'verified'
  );
$$;

-- Functions are executable by PUBLIC by default; only the API may call this one.
revoke all on function private.current_user_has_verified_factor() from public, anon, authenticated;
grant execute on function private.current_user_has_verified_factor() to app_runtime;
