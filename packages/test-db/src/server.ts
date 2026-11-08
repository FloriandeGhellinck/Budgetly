import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import postgres from "postgres";

// Point this at a server the tests may create and drop databases on, or leave
// it unset and the globalSetup starts a throwaway container.
export const SERVER_URL_ENV = "EXPENSE_TEST_DATABASE_URL";

// Pinned by digest (multi-arch index) so every machine runs the same server.
const IMAGE =
  "postgres:17.11-bookworm@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826";

export type PostgresServer = { url: string; stop(): void };

export type TestDatabase = {
  url: string;
  sql: postgres.Sql;
  close(): Promise<void>;
};

function docker(...args: string[]): string {
  return execFileSync("docker", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function withDatabase(server: string, database: string): string {
  const url = new URL(server);
  url.pathname = `/${database}`;
  return url.toString();
}

async function waitForServer(url: string): Promise<void> {
  const deadline = Date.now() + 60_000;
  for (;;) {
    const sql = postgres(url, { max: 1, onnotice: () => {} });
    try {
      await sql`select 1`;
      return;
    } catch (error) {
      if (Date.now() > deadline) {
        throw new Error("test-db: Postgres did not start", { cause: error });
      }
      await delay(200);
    } finally {
      await sql.end();
    }
  }
}

export async function startPostgres(): Promise<PostgresServer> {
  const name = `expense-test-db-${randomUUID().slice(0, 8)}`;
  try {
    // Data lives in memory with durability off: the server dies with the run.
    docker(
      "run",
      "--detach",
      "--rm",
      "--name",
      name,
      "--label",
      "expense.purpose=test-db",
      "--tmpfs",
      "/var/lib/postgresql/data:rw",
      "--publish",
      "127.0.0.1::5432",
      "--env",
      "POSTGRES_PASSWORD=test-db",
      IMAGE,
      "-c",
      "fsync=off",
      "-c",
      "synchronous_commit=off",
      "-c",
      "full_page_writes=off",
    );
  } catch (error) {
    throw new Error(
      `test-db: DB tests start Postgres in Docker. Start Docker, or set ${SERVER_URL_ENV} to a server they may create databases on.`,
      { cause: error },
    );
  }
  const stop = () => {
    try {
      docker("stop", name);
    } catch {
      // Already gone: --rm removed it when it stopped.
    }
  };
  try {
    const port = docker("port", name, "5432").split("\n")[0]?.split(":").at(-1);
    const url = `postgres://postgres:test-db@127.0.0.1:${port}/postgres`;
    await waitForServer(url);
    return { url, stop };
  } catch (error) {
    stop();
    throw error;
  }
}

export function serverUrl(): string {
  const url = process.env[SERVER_URL_ENV];
  if (!url) {
    throw new Error(
      `test-db: no test Postgres. Add @expense/test-db/global-setup to the Vitest project, or set ${SERVER_URL_ENV}.`,
    );
  }
  return url;
}

// An empty database of its own, so test files never see each other's rows.
export async function createTestDatabase(): Promise<TestDatabase> {
  const server = serverUrl();
  const name = `expense_t_${randomUUID().replaceAll("-", "")}`;
  const admin = postgres(server, { max: 1, onnotice: () => {} });
  try {
    await admin.unsafe(`create database ${name}`);
  } finally {
    await admin.end();
  }
  const url = withDatabase(server, name);
  const sql = postgres(url, { onnotice: () => {} });
  let closed: Promise<void> | undefined;
  return {
    url,
    sql,
    close() {
      closed ??= (async () => {
        await sql.end();
        const dropper = postgres(server, { max: 1, onnotice: () => {} });
        try {
          await dropper.unsafe(`drop database if exists ${name} with (force)`);
        } finally {
          await dropper.end();
        }
      })();
      return closed;
    },
  };
}
