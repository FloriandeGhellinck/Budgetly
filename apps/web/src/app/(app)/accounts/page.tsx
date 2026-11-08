import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/app-shell/coming-soon";
import { PageHeader } from "@/components/app-shell/page-header";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("accounts"))("title") };
}

// Stub, built on top of this shell.
export default async function AccountsPage() {
  const t = await getTranslations("accounts");
  return (
    <>
      <PageHeader title={t("title")} />
      <ComingSoon>{t("comingSoon")}</ComingSoon>
    </>
  );
}
