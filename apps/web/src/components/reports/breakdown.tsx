import { getLocale, getTranslations } from "next-intl/server";
import type { Api } from "@/lib/api/server";
import type { OptionLabels } from "@/lib/entry-options";
import { type TransactionFilters, transactionsHref } from "@/lib/transactions/filters";
import { RankedBars } from "./ranked-bars";

type BreakdownResult = Awaited<ReturnType<Api["reports"]["breakdown"]>>;

// Spending is series 2, saving series 3, as in the trend chart.
export const KIND_COLOR = { spending: "var(--chart-2)", saving: "var(--chart-3)" } as const;

// Expenses by category group, then category (ADR 0011), as ranked bars on one
// scale. Each row opens the matching transactions.
export async function Breakdown({
  breakdown,
  labels,
  scope,
}: {
  breakdown: BreakdownResult;
  labels: OptionLabels;
  // The period and filters the figures cover, carried into the links.
  scope: Pick<TransactionFilters, "from" | "to" | "beneficiaryId">;
}) {
  const [t, tTx, locale] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("transactions"),
    getLocale(),
  ]);
  const scale = breakdown.groups[0]?.totalMinor ?? 0;
  const base = { ...scope, direction: "expense" as const };

  return (
    <div className="flex flex-col gap-4">
      {breakdown.groups.map((group) => {
        const color = KIND_COLOR[group.kind ?? "spending"];
        const groupLabel = labels.group(group.groupId, group.name) ?? tTx("uncategorized");
        return (
          <div key={group.groupId ?? "none"} className="flex flex-col">
            <RankedBars
              label={groupLabel}
              locale={locale}
              scale={scale}
              className="font-medium"
              items={[
                {
                  key: "group",
                  label: groupLabel,
                  detail: tTx("count", { count: group.count }),
                  totalMinor: group.totalMinor,
                  color,
                  ...(group.groupId
                    ? { href: transactionsHref({ ...base, groupId: group.groupId }) }
                    : {}),
                },
              ]}
            />
            {group.groupId !== null && (
              <RankedBars
                label={t("categoriesOf", { group: groupLabel })}
                locale={locale}
                scale={scale}
                inset
                className="text-sm"
                items={group.categories.map((category) => ({
                  key: category.categoryId ?? "none",
                  label:
                    labels.category(category.categoryId, category.name) ?? tTx("uncategorized"),
                  totalMinor: category.totalMinor,
                  color: `color-mix(in oklab, ${color} 60%, transparent)`,
                  ...(category.categoryId
                    ? { href: transactionsHref({ ...base, categoryId: category.categoryId }) }
                    : {}),
                }))}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
