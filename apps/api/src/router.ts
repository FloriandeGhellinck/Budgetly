import { accountsRouter } from "./accounts/handler.ts";
import { beneficiariesRouter } from "./beneficiaries/handler.ts";
import { categoriesRouter } from "./categories/handler.ts";
import { meRouter } from "./me/handler.ts";
import { os } from "./orpc.ts";
import { suggestionsRouter } from "./suggestions/handler.ts";
import { tagsRouter } from "./tags/handler.ts";
import { transactionsRouter } from "./transactions/handler.ts";
import { transfersRouter } from "./transfers/handler.ts";

// `os.router` fails to compile while a contract procedure has no handler.
export const router = os.router({
  me: meRouter,
  accounts: accountsRouter,
  categories: categoriesRouter,
  beneficiaries: beneficiariesRouter,
  tags: tagsRouter,
  transactions: transactionsRouter,
  transfers: transfersRouter,
  suggestions: suggestionsRouter,
});
