import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@budgetly/ui/components/card";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app-shell/page-header";
import { BeneficiaryFilter } from "@/components/reports/beneficiary-filter";
import { Breakdown } from "@/components/reports/breakdown";
import { HeroCard } from "@/components/reports/hero-card";
import { MonthSwitcher } from "@/components/reports/month-switcher";
import { TrendChart } from "@/components/reports/trend-chart";
import { AddTransactionButton } from "@/components/transactions/add-button";
import { RecentTransactionList } from "@/app/(app)/transactions/transaction-list";
import { Button } from "@budgetly/ui/components/button";
import Link from "next/link";
import { transactionsHref } from "@/lib/transactions/filters";
import { getApi } from "@/lib/api/server";
import { monthDays, monthStart, shiftMonth } from "@/lib/dates";
import { getEntryOptions, optionLabels } from "@/lib/entry-options";
import { parseDashboardParams } from "@/lib/reports/params";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("dashboard"))("title") };
}

const TREND_MONTHS = 12;
const RECENT_COUNT = 5;

// The v1 reports (ADR 0011): the month overview as a hero card, the month's
// breakdown by group and category, its latest transactions and the 12-month
// trend. The month and the beneficiary filter live in the URL.
export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const now = new Date();
  const params = parseDashboardParams(await searchParams, now);
  const days = monthDays(params.month);
  const [api, t, format, options] = await Promise.all([
    getApi(),
    getTranslations("dashboard"),
    getFormatter(),
    getEntryOptions(),
  ]);
  const beneficiary = params.beneficiaryId ? { beneficiaryId: params.beneficiaryId } : {};
  const [anyTransaction, recent, overview, trend, breakdown] = await Promise.all([
    api.transactions.list({ limit: 1 }),
    api.transactions.list({ ...days, limit: RECENT_COUNT }),
    api.reports.monthOverview({ month: params.month }),
    api.reports.trend({ from: shiftMonth(params.month, 1 - TREND_MONTHS), to: params.month }),
    api.reports.breakdown({ ...days, ...beneficiary }),
  ]);
  const header = (
    <PageHeader
      title={t("title")}
      actions={<AddTransactionButton>{t("addFirst")}</AddTransactionButton>}
    />
  );

  if (anyTransaction.items.length === 0) {
    return (
      <>
        {header}
        <Card>
          <CardHeader>
            <CardTitle>{t("welcomeTitle")}</CardTitle>
            <CardDescription>{t("welcomeBody")}</CardDescription>
          </CardHeader>
          <CardContent>
            <AddTransactionButton>{t("addFirst")}</AddTransactionButton>
          </CardContent>
        </Card>
      </>
    );
  }

  const points = trend.months.map((m) => ({
    month: m.month,
    label: format.dateTime(monthStart(m.month), { month: "short" }),
    income: m.incomeMinor,
    spending: m.spendingMinor,
    saving: m.savingMinor,
  }));

  return (
    <div className="flex flex-col gap-4">
      {header}
      <MonthSwitcher params={params} now={now} />
      <HeroCard {...overview} />

      <Card>
        <CardHeader>
          <CardTitle>{t("breakdownTitle")}</CardTitle>
          <CardDescription>{t("breakdownDescription")}</CardDescription>
          <CardAction>
            <BeneficiaryFilter value={params.beneficiaryId} beneficiaries={options.beneficiaries} />
          </CardAction>
        </CardHeader>
        <CardContent>
          {breakdown.groups.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {params.beneficiaryId ? t("breakdownEmptyFiltered") : t("breakdownEmpty")}
            </p>
          ) : (
            <Breakdown
              breakdown={breakdown}
              labels={optionLabels(options)}
              scope={{ ...days, ...beneficiary }}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("recentTitle")}</CardTitle>
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href={transactionsHref(days)} />}
            >
              {t("seeAll")}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="px-1">
          {recent.items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("recentEmpty")}</p>
          ) : (
            <RecentTransactionList items={recent.items} label={t("recentTitle")} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("trendTitle")}</CardTitle>
          <CardDescription>{t("trendDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <TrendChart points={points} />
        </CardContent>
      </Card>
    </div>
  );
}
