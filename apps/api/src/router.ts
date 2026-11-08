import * as accounts from "./accounts/handler.ts";
import * as me from "./me/handler.ts";
import { os } from "./orpc.ts";

export const router = os.router({
  me,
  accounts,
});
