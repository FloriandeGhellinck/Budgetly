"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@budgetly/ui/components/select";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { LOCALES } from "@/lib/i18n/config";
import { setLocale } from "@/lib/i18n/set-locale";

export function LanguageSelect({ locale }: { locale: string }) {
  const t = useTranslations();
  const [pending, startTransition] = useTransition();
  const items = LOCALES.map((value) => ({ value, label: t(`languages.${value}`) }));
  return (
    <Select
      items={items}
      value={locale}
      disabled={pending}
      onValueChange={(value: string | null) => {
        if (value) startTransition(() => setLocale(value));
      }}
    >
      <SelectTrigger aria-label={t("settings.language")} className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const THEMES = ["light", "dark", "system"] as const;

export function ThemeSelect() {
  const t = useTranslations("settings");
  const { theme, setTheme } = useTheme();
  const items = THEMES.map((value) => ({ value, label: t(`themes.${value}`) }));
  return (
    <Select
      items={items}
      value={theme ?? "system"}
      onValueChange={(value: string | null) => value && setTheme(value)}
    >
      <SelectTrigger aria-label={t("theme")} className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
