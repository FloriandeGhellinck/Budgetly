import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/app-shell/coming-soon";
import { PageHeader } from "@/components/app-shell/page-header";
import { AddTransactionButton } from "@/components/transactions/add-button";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("dashboard"))("title") };
}

// Stub: the reports dashboard (ADR 0011) is built on top of this shell.
export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  return (
    <>
      <PageHeader
        title={t("title")}
        actions={<AddTransactionButton>{t("addFirst")}</AddTransactionButton>}
      />
      <ComingSoon>{t("comingSoon")}</ComingSoon>
    </>
  );
}
