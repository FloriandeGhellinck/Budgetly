import { Button } from "@budgetly/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@budgetly/ui/components/card";
import { Money } from "@budgetly/ui/components/money";
import { ArrowLeftIcon, ListIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app-shell/page-header";
import { KIND_COLOR } from "@/components/reports/breakdown";
import { RankedBars } from "@/components/reports/ranked-bars";
import { orNotFound } from "@/lib/api/not-found";
import { getApi } from "@/lib/api/server";
import { fromIsoDay } from "@/lib/dates";
import { getEntryOptions, optionLabels } from "@/lib/entry-options";
import { transactionsHref } from "@/lib/transactions/filters";

// Cached: the metadata and the page read the same report once per request.
const loadTag = cache(async (id: string) => {
  const api = await getApi();
  return orNotFound(api.reports.tag({ tagId: id }));
});

export async function generateMetadata({ params }: PageProps<"/tags/[id]">): Promise<Metadata> {
  return { title: (await loadTag((await params).id)).tag.name };
}

// What one tag (an event, a trip) cost: totals, span and per-category
// breakdown (ADR 0011), linking to its transactions.
export default async function TagPage({ params }: PageProps<"/tags/[id]">) {
  const [report, t, tTx, locale, format, options] = await Promise.all([
    params.then(({ id }) => loadTag(id)),
    getTranslations("tags"),
    getTranslations("transactions"),
    getLocale(),
    getFormatter(),
    getEntryOptions(),
  ]);
  const labels = optionLabels(options);
  const tag = report.tag.name;
  const span =
    report.firstOn && report.lastOn
      ? format.dateTimeRange(fromIsoDay(report.firstOn), fromIsoDay(report.lastOn), {
          dateStyle: "medium",
        })
      : null;
  const byDirection = (direction: "expense" | "income") =>
    report.categories
      .filter((row) => row.direction === direction)
      .map((row) => ({
        key: row.categoryId ?? "none",
        label: labels.category(row.categoryId, row.categoryName) ?? tTx("uncategorized"),
        detail: labels.group(row.groupId, row.groupName) ?? undefined,
        totalMinor: row.totalMinor,
        color: direction === "income" ? "var(--chart-1)" : KIND_COLOR.spending,
        ...(row.categoryId
          ? { href: transactionsHref({ tag, categoryId: row.categoryId, direction }) }
          : {}),
      }));
  const expenses = byDirection("expense");
  const incomes = byDirection("income");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={tag}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={transactionsHref({ tag })} />}
          >
            <ListIcon />
            {t("seeTransactions")}
          </Button>
        }
      />
      <Button
        variant="link"
        className="self-start px-0"
        nativeButton={false}
        render={<Link href="/tags" />}
      >
        <ArrowLeftIcon />
        {t("back")}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{t("spent")}</CardTitle>
          <CardDescription>
            {[tTx("count", { count: report.count }), span].filter(Boolean).join(" · ")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <Money
            amountMinor={report.expenseMinor}
            locale={locale}
            className="text-2xl font-semibold"
          />
          {report.incomeMinor > 0 && (
            <span className="text-sm text-muted-foreground">
              {t("received")} <Money amountMinor={report.incomeMinor} locale={locale} />
            </span>
          )}
        </CardContent>
      </Card>

      {expenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("byCategory")}</CardTitle>
          </CardHeader>
          <CardContent>
            <RankedBars items={expenses} locale={locale} label={t("byCategory")} />
          </CardContent>
        </Card>
      )}
      {incomes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("incomeByCategory")}</CardTitle>
          </CardHeader>
          <CardContent>
            <RankedBars items={incomes} locale={locale} label={t("incomeByCategory")} />
          </CardContent>
        </Card>
      )}
      {report.count === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("noTransactions")}</p>
      )}
    </div>
  );
}
