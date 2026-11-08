import type { ErrorCode } from "@expense/contract";

// What every server action returns to the client. Declared API errors keep
// their code (ADR 0027) so the form can show the matching message; anything
// else is UNEXPECTED. Messages live under `errors.<code>` in messages/*.json.
export type ActionErrorCode = ErrorCode | "INVALID_INPUT" | "UNEXPECTED";

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: ActionErrorCode };
