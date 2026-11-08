import { Button } from "@expense/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@expense/ui/components/card";
import { ChevronRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app-shell/page-header";
import { NAV_ITEMS } from "@/components/app-shell/nav-items";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/lib/auth-actions";
import { LanguageSelect, ThemeSelect } from "./preferences";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("settings"))("title") };
}

export default async function SettingsPage() {
  const [user, locale, t, tNav] = await Promise.all([
    requireUser(),
    getLocale(),
    getTranslations("settings"),
    getTranslations("nav"),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} />

      {/* Phones: the screens the bottom bar has no room for. */}
      <Card className="md:hidden">
        <CardContent className="flex flex-col">
          {NAV_ITEMS.filter((item) => !item.mobile).map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 py-2">
              <item.icon className="size-4" />
              <span className="flex-1">{tNav(item.label)}</span>
              <ChevronRightIcon className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("language")}</CardTitle>
          <CardDescription>{t("languageDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageSelect locale={locale} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("theme")}</CardTitle>
          <CardDescription>{t("themeDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSelect />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("security")}</CardTitle>
          <CardDescription>{t("securityDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/settings/security" />}
          >
            {t("security")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("account")}</CardTitle>
          {user.email && (
            <CardDescription>{t("signedInAs", { email: user.email })}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form action={signOut}>
            <Button type="submit" variant="outline">
              {t("signOut")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
