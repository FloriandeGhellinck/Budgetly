import type { Db } from "@expense/db";
import { onError, ORPCError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { Hono } from "hono";
import type { VerifyToken } from "./auth.ts";
import { router } from "./router.ts";

export type AppDeps = { db: Db; verifyToken: VerifyToken };

// Built from its dependencies so tests run the real app against a test
// database and a locally signed JWT; src/index.ts wires production ones.
export function createApp(deps: AppDeps): Hono {
  const rpc = new RPCHandler(router, {
    // Client interceptors see the error a procedure threw, before it becomes a response.
    clientInterceptors: [
      onError((error) => {
        // Declared errors are answers, not failures.
        if (!(error instanceof ORPCError) || error.status >= 500) console.error(error);
      }),
    ],
  });

  const app = new Hono();

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.use("/rpc/*", async (c, next) => {
    const { matched, response } = await rpc.handle(c.req.raw, {
      prefix: "/rpc",
      context: { ...deps, authorization: c.req.header("authorization") },
    });
    if (matched) return c.newResponse(response.body, response);
    return next();
  });

  return app;
}
