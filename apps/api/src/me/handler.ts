import { authed } from "../orpc.ts";
import { bootstrapUser } from "./repo.ts";

export const bootstrap = authed.me.bootstrap.handler(({ context }) =>
  bootstrapUser(context.tx, context.userId),
);

export const meRouter = { bootstrap };
