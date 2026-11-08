import { authed } from "../orpc.ts";
import { listTags } from "./repo.ts";

export const list = authed.tags.list.handler(async ({ context }) => ({
  items: await listTags(context.tx, context.userId),
}));

export const tagsRouter = { list };
