import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";
import type { Locale } from "./config";

// Typed against English: a key missing from French fails `pnpm typecheck`.
export const MESSAGES: Record<Locale, typeof en> = { en, fr };
