// Local only. Not named server.ts: Vercel would take that for the entry point.
import { serve } from "@hono/node-server";
import app, { env } from "./index.ts";

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`apps/api listening on http://localhost:${info.port}`);
});
