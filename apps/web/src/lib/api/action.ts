import "server-only";
import { ERRORS, type ErrorCode } from "@expense/contract";
import { ORPCError } from "@orpc/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { getApi, type Api } from "./server";

function isDeclared(code: string): code is ErrorCode {
  return Object.hasOwn(ERRORS, code);
}

// Runs one server action's API calls and folds the outcome into an
// ActionResult. A rejected session sends the user back to /login, a session
// that still owes its second factor to /login/mfa (ADR 0032).
export async function runAction<T>(call: (api: Api) => Promise<T>): Promise<ActionResult<T>> {
  let signIn: string | null = null;
  try {
    return { ok: true, data: await call(await getApi()) };
  } catch (error) {
    if (error instanceof ORPCError) {
      if (error.code === "UNAUTHORIZED") signIn = "/login";
      else if (error.code === "MFA_REQUIRED") signIn = "/login/mfa";
      else if (isDeclared(error.code)) return { ok: false, error: error.code };
      else if (error.code === "BAD_REQUEST") return { ok: false, error: "INVALID_INPUT" };
    }
    if (!signIn) {
      console.error(error);
      return { ok: false, error: "UNEXPECTED" };
    }
  }
  // Outside the try: redirect() works by throwing.
  redirect(signIn);
}

// A write: on success, refresh every page, since lists, figures and form
// options all depend on it (ADR 0030).
export async function runWrite<T>(call: (api: Api) => Promise<T>): Promise<ActionResult<T>> {
  const result = await runAction(call);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
