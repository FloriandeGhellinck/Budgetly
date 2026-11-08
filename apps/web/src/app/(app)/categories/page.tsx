import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app-shell/page-header";
import { getApi } from "@/lib/api/server";
import { getEntryOptions } from "@/lib/entry-options";
import { CategoryManager } from "./category-manager";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("categories"))("title") };
}

// Categories ("for what") and beneficiaries ("for whom"), with defaults
// translated by seed key (ADR 0010, 0031).
export default async function CategoriesPage() {
  const [api, t, options] = await Promise.all([
    getApi(),
    getTranslations("categories"),
    getEntryOptions(),
  ]);
  // Options carry the translated labels; the list adds each group's kind.
  const { groups } = await api.categories.list({});
  const kinds = new Map(groups.map((group) => [group.id, group.kind]));
  return (
    <>
      <PageHeader title={t("title")} />
      <p className="pb-4 text-sm text-muted-foreground">{t("intro")}</p>
      <CategoryManager
        groups={options.categoryGroups.map((group) => ({
          ...group,
          kind: kinds.get(group.id) ?? null,
        }))}
        beneficiaries={options.beneficiaries}
      />
    </>
  );
}
