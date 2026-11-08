import { MAILPIT_URL, SUPABASE_URL } from "./local-stack";

// Fails fast with a useful message when local Supabase is not running.
export default async function globalSetup() {
  for (const url of [`${SUPABASE_URL}/auth/v1/health`, `${MAILPIT_URL}/api/v1/info`]) {
    try {
      await fetch(url);
    } catch {
      throw new Error(`${url} is unreachable. Start local Supabase first: pnpm db:start`);
    }
  }
}
