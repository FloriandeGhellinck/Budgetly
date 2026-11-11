// The Postgres error behind a failed query, so tests can pin its code and
// constraint. Drizzle wraps the driver error in its cause chain.
export type PgError = { code: string; constraint?: string };

export async function pgError(promise: Promise<unknown>): Promise<PgError> {
  try {
    await promise;
  } catch (error) {
    let current: unknown = error;
    for (let depth = 0; current && typeof current === "object" && depth < 8; depth++) {
      const candidate = current as { code?: unknown; constraint_name?: unknown; cause?: unknown };
      if (typeof candidate.code === "string") {
        const found: PgError = { code: candidate.code };
        if (typeof candidate.constraint_name === "string") {
          found.constraint = candidate.constraint_name;
        }
        return found;
      }
      current = candidate.cause;
    }
    throw error;
  }
  throw new Error("pgError: expected the query to fail, but it succeeded");
}
