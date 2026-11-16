import { type AnalysisType, type DayRange } from "@budgetly/contract";
import { Card, CardContent } from "@budgetly/ui/components/card";
import { Money } from "@budgetly/ui/components/money";
import { formatMoney } from "@budgetly/ui/lib/money";
import { paletteVar } from "@budgetly/ui/lib/palette";
import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app-shell/page-header";
import { CompareToggle } from "@/components/analysis/compare-toggle";
import { AnalysisNavigation, PendingArea } from "@/components/analysis/navigation";
import { AnalysisResult } from "@/components/analysis/result";
import { AnalysisToolbar } from "@/components/analysis/toolbar";
import { AddTransactionButton } from "@/components/transactions/add-button";
import { comparisonChange } from "@/lib/analysis/compare";
import { analysisItems } from "@/lib/analysis/items";
import {
  analysisHref,
  analysisInput,
  drilledGroup,
  drillUp,
  parseAnalysisView,
} from "@/lib/analysis/view";
import { getApi } from "@/lib/api/server";
import { dayOf, fromIsoDay, monthDays, monthStart } from "@/lib/dates";
import { getEntryOptions, optionLabels } from "@/lib/entry-options";
import { formatChange } from "@/lib/reports/figures";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("analysis"))("title") };
}

const SERIES: Record<AnalysisType, string> = {
  income: "var(--chart-1)",
  spending: "var(--chart-2)",
  saving: "var(--chart-3)",
};

// The Analysis page (ADR 0035): the view lives in the URL, the server asks
// reports.analysis for its figures, the client controls only change the URL.
export default async function AnalysisPage({ searchParams }: PageProps<"/analysis">) {
  const view = parseAnalysisView(await searchParams);
  const today = dayOf(new Date());
  const input = analysisInput(view, today);
  const range = { from: input.from, to: input.to };
  const [api, t, tFigures, tTx, format, locale, options] = await Promise.all([
    getApi(),
    getTranslations("analysis"),
    getTranslations("dashboard.figures"),
    getTranslations("transactions"),
    getFormatter(),
    getLocale(),
    getEntryOptions(),
  ]);
  const [result, tags] = await Promise.all([api.reports.analysis(input), api.tags.list({})]);

  const labels = optionLabels(options);
  const groups = new Map(options.categoryGroups.map((g) => [g.id, g]));
  const categories = new Map(
    options.categoryGroups.flatMap((g) => g.categories.map((c) => [c.id, c] as const)),
  );
  const tagNames = new Map(tags.items.map((tag) => [tag.id, tag.name]));
  const order = new Map(
    [...options.beneficiaries, ...options.accounts, ...tags.items].map((o, i) => [o.id, i]),
  );
  const multiYear = range.from.slice(0, 4) !== range.to.slice(0, 4);

  // "November 2026", "Sep – Nov 2026" or "3 Oct – 20 Nov 2026".
  const periodLabel = ({ from, to }: DayRange) => {
    const wholeMonths = from.endsWith("-01") && monthDays(to.slice(0, 7)).to === to;
    if (wholeMonths && from.slice(0, 7) === to.slice(0, 7)) {
      return format.dateTime(fromIsoDay(from), { month: "long", year: "numeric" });
    }
    return format.dateTimeRange(
      fromIsoDay(from),
      fromIsoDay(to),
      wholeMonths
        ? { month: "short", year: "numeric" }
        : { day: "numeric", month: "short", year: "numeric" },
    );
  };

  const items = analysisItems(result.items, {
    view,
    range,
    thisMonth: today.slice(0, 7),
    label: (row) => {
      switch (view.groupBy) {
        case "group":
          return labels.group(row.key, row.name) ?? "";
        case "category":
          return labels.category(row.key, row.name) ?? "";
        case "beneficiary":
          return labels.beneficiary(row.key, row.name) ?? "";
        case "account":
          return labels.account(row.key, row.name) ?? "";
        default:
          return row.name ?? "";
      }
    },
    noneLabel:
      view.groupBy === "group" || view.groupBy === "category"
        ? tTx("uncategorized")
        : t(`none.${view.groupBy}`),
    month: (key) => ({
      label: format.dateTime(monthStart(key), { month: "long", year: "numeric" }),
      short: format.dateTime(
        monthStart(key),
        multiYear ? { month: "short", year: "2-digit" } : { month: "short" },
      ),
    }),
    inProgress: t("inProgress"),
    groupLabel: (id) => groups.get(id)?.label,
    order: (id) => order.get(id) ?? 0,
    tagName: (id) => tagNames.get(id),
  });

  const drilled = drilledGroup(view);
  const typesLabel = view.types.map((type) => tFigures(type)).join(" + ");
  const singleGroup = view.groupIds.length === 1 ? groups.get(view.groupIds[0] ?? "") : undefined;
  const singleCategory =
    view.categoryIds.length === 1 ? categories.get(view.categoryIds[0] ?? "") : undefined;
  const seriesColor = singleCategory
    ? paletteVar(singleCategory.color)
    : singleGroup
      ? paletteVar(singleGroup.color)
      : view.types.length === 1
        ? SERIES[view.types[0] ?? "spending"]
        : SERIES.spending;

  const comparison = result.comparison;
  // Like the mockup, by month: a compare range starting in a month before the
  // first recorded one has no history to compare with.
  const lacksHistory =
    comparison !== null &&
    (result.firstOn === null || comparison.from.slice(0, 7) < result.firstOn.slice(0, 7));
  const change = comparison
    ? comparisonChange(result.totalMinor, comparison.totalMinor, view.types)
    : null;
  const split = (["income", "spending", "saving"] as const)
    .filter((type) => view.types.includes(type))
    .map((type) => ({ type, minor: result.byType[`${type}Minor`] }))
    .filter(({ minor }) => minor > 0);

  return (
    <AnalysisNavigation view={view}>
      <div className="flex flex-col gap-4">
        <PageHeader
          title={t("title")}
          actions={<AddTransactionButton>{tTx("add")}</AddTransactionButton>}
        />
        <AnalysisToolbar tags={tags.items} today={today} />

        <PendingArea>
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground first-letter:uppercase">
                    {periodLabel(range)}
                  </span>
                  <Money
                    amountMinor={result.totalMinor}
                    locale={locale}
                    className="text-3xl leading-tight font-semibold tracking-tight"
                  />
                  {view.types.length > 1 && split.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {split.map(({ type, minor }, index) => (
                        <span key={type}>
                          {index > 0 && " · "}
                          {tFigures(type)} <Money amountMinor={minor} locale={locale} />
                        </span>
                      ))}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 sm:items-end sm:text-right">
                  {comparison && (
                    <span className="flex items-center gap-1 text-sm sm:justify-end">
                      {lacksHistory ? (
                        <span className="text-muted-foreground">
                          {t("noHistory", { period: periodLabel(comparison) })}
                        </span>
                      ) : change === null ? (
                        <span className="text-muted-foreground">
                          {t("nothingIn", { period: periodLabel(comparison) })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground tabular-nums">
                          {t.rich("delta", {
                            change: formatChange(change.bps, locale),
                            period: periodLabel(comparison),
                            amount: formatMoney(comparison.totalMinor, { locale }),
                            b: (chunks) => (
                              <b
                                className="font-semibold text-foreground"
                                style={toneColor(change.tone)}
                              >
                                {chunks}
                              </b>
                            ),
                          })}
                        </span>
                      )}
                    </span>
                  )}
                  <CompareToggle />
                </div>
              </div>

              {drilled && (
                <nav
                  aria-label={t("breadcrumb")}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground"
                >
                  <Link
                    href={analysisHref(drillUp(view))}
                    className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
                  >
                    <ArrowLeftIcon aria-hidden className="size-3.5" />
                    {t("allGroups")}
                  </Link>
                  <span aria-hidden>/</span>
                  <span aria-current="page" className="font-semibold text-foreground">
                    {groups.get(drilled)?.label}
                  </span>
                </nav>
              )}

              {result.totalMinor === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">{t("empty")}</p>
              ) : (
                <AnalysisResult
                  items={items}
                  totalMinor={result.totalMinor}
                  groupBy={view.groupBy}
                  display={view.display}
                  caption={drilled ? (groups.get(drilled)?.label ?? typesLabel) : typesLabel}
                  seriesColor={seriesColor}
                />
              )}
              {view.groupBy === "tag" && result.totalMinor > 0 && (
                <p className="text-xs text-muted-foreground">{t("tagNote")}</p>
              )}
            </CardContent>
          </Card>
        </PendingArea>
      </div>
    </AnalysisNavigation>
  );
}

// More spending reads red, more income or saving green; the sign in the
// text carries the direction too, so colour is never alone.
function toneColor(tone: "good" | "bad" | "neutral") {
  if (tone === "neutral") return undefined;
  return { color: paletteVar(tone === "good" ? "green" : "red", "fg") };
}
