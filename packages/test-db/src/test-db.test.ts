import { afterAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "./server";

describe("createTestDatabase", () => {
  const databases: Array<Awaited<ReturnType<typeof createTestDatabase>>> = [];
  afterAll(async () => {
    await Promise.all(databases.map((db) => db.close()));
  });

  it("runs Postgres 17", async () => {
    const db = await createTestDatabase();
    databases.push(db);
    const [row] = await db.sql<
      { version: string }[]
    >`select current_setting('server_version') as version`;
    expect(row?.version).toMatch(/^17\./);
  });

  it("gives each caller its own database", async () => {
    const first = await createTestDatabase();
    const second = await createTestDatabase();
    databases.push(first, second);
    await first.sql`create table probe (id int)`;
    const [row] = await second.sql<{ exists: boolean }[]>`
      select to_regclass('public.probe') is not null as exists
    `;
    expect(row?.exists).toBe(false);
  });
});
