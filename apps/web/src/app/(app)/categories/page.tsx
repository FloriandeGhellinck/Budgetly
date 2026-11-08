import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/app-shell/coming-soon";
import { PageHeader } from "@/components/app-shell/page-header";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("categories"))("title") };
}

// Stub, built on top of this shell.
export default async function CategoriesPage() {
  const t = await getTranslations("categories");
  return (
    <>
      <PageHeader title={t("title")} />
      <ComingSoon>{t("comingSoon")}</ComingSoon>
    </>
  );
}
