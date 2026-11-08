import type en from "../messages/en.json";
import type { Locale } from "./lib/i18n/config";

// Typed keys for useTranslations / getTranslations.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof en;
  }
}
