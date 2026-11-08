import "server-only";
import { ERRORS, type ErrorCode } from "@expense/contract";
import { ORPCError } from "@orpc/client";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { getApi, type Api } from "./server";

function isDeclared(code: string): code is ErrorCode {
  return Object.hasOwn(ERRORS, code);
}

// Runs one server action's API calls and folds the outcome into an
// ActionResult. A rejected session sends the user back to /login.
export async function runAction<T>(call: (api: Api) => Promise<T>): Promise<ActionResult<T>> {
  let unauthorized = false;
  try {
    return { ok: true, data: await call(await getApi()) };
  } catch (error) {
    if (error instanceof ORPCError) {
      if (error.code === "UNAUTHORIZED") unauthorized = true;
      else if (isDeclared(error.code)) return { ok: false, error: error.code };
      else if (error.code === "BAD_REQUEST") return { ok: false, error: "INVALID_INPUT" };
    }
    if (!unauthorized) {
      console.error(error);
      return { ok: false, error: "UNEXPECTED" };
    }
  }
  // Outside the try: redirect() works by throwing.
  redirect("/login");
}
