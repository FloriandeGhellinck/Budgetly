import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALE_COOKIE, resolveLocale } from "./config";
import { MESSAGES } from "./messages";

// No locale in the URL: the saved choice, else Accept-Language (ADR 0031).
export default getRequestConfig(async () => {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const locale = resolveLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    headerList.get("accept-language"),
  );
  return { locale, messages: MESSAGES[locale], timeZone: "Europe/Brussels" };
});
