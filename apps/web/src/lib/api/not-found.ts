import "server-only";
import { ORPCError } from "@orpc/client";
import { notFound } from "next/navigation";

// For a page addressed by id: an id the user does not own (NOT_FOUND) or a
// malformed one (BAD_REQUEST) renders the 404 page instead of an error.
export async function orNotFound<T>(call: Promise<T>): Promise<T> {
  try {
    return await call;
  } catch (error) {
    if (error instanceof ORPCError && (error.code === "NOT_FOUND" || error.code === "BAD_REQUEST"))
      notFound();
    throw error;
  }
}
