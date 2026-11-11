import { SERVER_URL_ENV, startPostgres } from "./server";

// Vitest globalSetup: one Postgres per run, started before workers spawn so
// they inherit its URL. A server named by the env var is used as is.
export default async function setup(): Promise<() => void> {
  if (process.env[SERVER_URL_ENV]) return () => {};
  const server = await startPostgres();
  process.env[SERVER_URL_ENV] = server.url;
  return () => server.stop();
}
