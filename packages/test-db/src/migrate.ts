import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";
import type postgres from "postgres";

// Walked up to rather than counted off: this module runs from src/ (its own
// tests) and bundled in dist/ (other packages), at different depths.
function findMigrationsDir(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const candidate = join(dir, "supabase/migrations");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir || dir === parse(dir).root) {
      throw new Error(`test-db: no supabase/migrations above ${import.meta.url}`);
    }
    dir = parent;
  }
}

// Test-only: the role the API logs in as, given a password here so tests can
// connect as it. The migration's own `create role` then finds it in place.
export const APP_ROLE = "app_runtime";
const APP_ROLE_PASSWORD = "app_runtime";

// What a Supabase project has before our migrations run: the auth.users table
// user_id references, the auth.mfa_factors columns the MFA check reads, and
// the API roles the migrations revoke from. Roles are
// cluster-wide and test databases are migrated in parallel, hence the guards.
const BOOTSTRAP_SQL = `
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key default gen_random_uuid());
create table if not exists auth.mfa_factors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null
);

do $$ begin
  create role ${APP_ROLE} with login password '${APP_ROLE_PASSWORD}' nosuperuser nobypassrls noinherit;
exception when duplicate_object or unique_violation then null;
end $$;
do $$ begin
  create role anon nologin noinherit;
exception when duplicate_object or unique_violation then null;
end $$;
do $$ begin
  create role authenticated nologin noinherit;
exception when duplicate_object or unique_violation then null;
end $$;
`;

// Applies supabase/migrations in filename order, as `supabase db push` does.
export async function migrate(sql: postgres.Sql): Promise<void> {
  const dir = findMigrationsDir();
  await sql.unsafe(BOOTSTRAP_SQL);
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const name of files) {
    await sql.unsafe(readFileSync(join(dir, name), "utf8"));
  }
}

// The same database, logged in as the API's role, so RLS applies.
export function appRoleUrl(url: string): string {
  const appUrl = new URL(url);
  appUrl.username = APP_ROLE;
  appUrl.password = APP_ROLE_PASSWORD;
  return appUrl.toString();
}
