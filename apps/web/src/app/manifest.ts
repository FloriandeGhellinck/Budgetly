import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";
import { ADD_PARAM } from "@/lib/quick-entry";

// Installable PWA (ADR 0019). No service worker: Chromium and Safari install
// without one, and the app needs the network for every read anyway.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [t, tNav] = await Promise.all([getTranslations("app"), getTranslations("nav")]);
  return {
    name: t("name"),
    short_name: t("shortName"),
    description: t("description"),
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#171717",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    // Long-press on the home-screen icon: straight to quick entry.
    shortcuts: [{ name: tNav("add"), url: `/?${ADD_PARAM}=expense` }],
  };
}
