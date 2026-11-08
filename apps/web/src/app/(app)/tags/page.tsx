import { Card, CardContent } from "@expense/ui/components/card";
import { ChevronRightIcon, TagIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app-shell/page-header";
import { getApi } from "@/lib/api/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("tags"))("title") };
}

// Every tag, each opening its report (ADR 0011). Tags are created from the
// transaction form, so there is no "new tag" here.
export default async function TagsPage() {
  const [api, t] = await Promise.all([getApi(), getTranslations("tags")]);
  const { items } = await api.tags.list({});
  return (
    <>
      <PageHeader title={t("title")} />
      {items.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <Card>
          <CardContent>
            <ul aria-label={t("title")} className="flex flex-col divide-y">
              {items.map((tag) => (
                <li key={tag.id}>
                  <Link href={`/tags/${tag.id}`} className="flex items-center gap-3 py-2.5">
                    <TagIcon className="size-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{tag.name}</span>
                    <ChevronRightIcon className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
