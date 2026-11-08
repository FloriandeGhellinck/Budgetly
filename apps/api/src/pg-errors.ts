// The Postgres constraint behind a failed query. Drizzle wraps the driver
// error, so the cause chain is walked.
export function violatedConstraint(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; current && typeof current === "object" && depth < 8; depth++) {
    const candidate = current as { constraint_name?: unknown; cause?: unknown };
    if (typeof candidate.constraint_name === "string") return candidate.constraint_name;
    current = candidate.cause;
  }
  return undefined;
}

// Turns a constraint violation into the call site's typed error. The mapping
// is per call site: the same constraint means different things on different
// writes (transactions_category_fk is a direction mismatch on insert, "in
// use" on a category delete). Unmapped errors propagate unchanged.
export async function onConstraint<T>(
  promise: Promise<T>,
  map: Partial<Record<string, () => Error>>,
): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    const constraint = violatedConstraint(error);
    const toError = constraint ? map[constraint] : undefined;
    throw toError ? toError() : error;
  }
}
