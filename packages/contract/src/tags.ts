import { z } from "zod";
import { Id } from "./common";
import { procedure } from "./procedure";

export const TagSchema = z.object({ id: Id, name: z.string() });
export type Tag = z.infer<typeof TagSchema>;

const list = procedure({
  description:
    "List the caller's tags by name: free-form labels grouping transactions across categories, usually an event or trip. Tags are created on the fly when a transaction is written with a new tag name (matched case-insensitively), so reuse an existing name where it fits.",
  examples: [{}],
  readOnly: true,
  idempotent: true,
  input: z.object({}),
  output: z.object({ items: z.array(TagSchema) }),
  errors: {},
});

export const tagsContract = { list };
