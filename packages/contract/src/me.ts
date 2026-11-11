import { z } from "zod";
import { EmptyInput } from "./common";
import { procedure } from "./procedure";

const bootstrap = procedure({
  description:
    "Prepare the caller's space: on first use it creates the account Main (100 % share), the beneficiary Me and the default category groups and categories. Safe to call on every sign-in; later calls change nothing. Returns created = true only on the call that created the defaults.",
  examples: [{}],
  readOnly: false,
  idempotent: true,
  input: EmptyInput,
  output: z.object({ created: z.boolean() }),
  errors: {},
});

export const meContract = { bootstrap };
