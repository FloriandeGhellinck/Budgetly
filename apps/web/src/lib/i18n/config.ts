export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
// Set by the language picker in settings; wins over Accept-Language.
export const LOCALE_COOKIE = "expense-locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

// The first supported language in an Accept-Language header, by quality.
// "fr-BE,fr;q=0.9,en;q=0.8" → "fr". Falls back to English.
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  const ranked = (acceptLanguage ?? "")
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const quality = q ? Number(q.slice(2)) : 1;
      return { language: tag.split("-")[0]?.toLowerCase(), quality, index };
    })
    .filter((entry) => entry.language && Number.isFinite(entry.quality) && entry.quality > 0)
    .toSorted((a, b) => b.quality - a.quality || a.index - b.index);
  return ranked.map((entry) => entry.language).find(isLocale) ?? DEFAULT_LOCALE;
}

// The locale used for a request: the user's choice, else the browser's.
export function resolveLocale(cookie: string | undefined, acceptLanguage: string | null): Locale {
  return isLocale(cookie) ? cookie : negotiateLocale(acceptLanguage);
}
