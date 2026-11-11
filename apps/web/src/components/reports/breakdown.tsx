import { type CategoryColor, type CategoryIcon, NEUTRAL_ICON } from "@budgetly/contract";
import { Badge } from "@budgetly/ui/components/badge";
import { Money } from "@budgetly/ui/components/money";
import { paletteVar } from "@budgetly/ui/lib/palette";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { CategoryChip, NO_CATEGORY_COLOR } from "@/components/categories/category-chip";
import { CATEGORY_ICON_COMPONENTS } from "@/components/categories/icons";
import type { Api } from "@/lib/api/server";
import type { OptionLabels } from "@/lib/entry-options";
import { donutSegments, foldTail, formatRate, shareBps } from "@/lib/reports/figures";
import { type TransactionFilters, transactionsHref } from "@/lib/transactions/filters";
import { RankedBars } from "./ranked-bars";

type BreakdownResult = Awaited<ReturnType<Api["reports"]["breakdown"]>>;

// One part of the month: a group (or the uncategorized bucket, or "Other"),
// labelled and styled for display.
type Part = {
  key: string;
  label: string;
  color: CategoryColor | typeof NO_CATEGORY_COLOR;
  icon: CategoryIcon | null;
  totalMinor: number;
  href?: string;
};

const DONUT_MAX_PARTS = 6;
const TOP_CATEGORIES = 6;

// Expenses of the month by category group and category (ADR 0011): pastel
// group tiles, a donut of the split with its legend, and the top categories
// as ranked bars. Colour follows the group or category (ADR 0034), never its
// rank; every part is also named, iconed and priced, so nothing relies on
// colour alone. Each part opens the matching transactions.
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
  const base = { ...scope, direction: "expense" as const };
  const groups = breakdown.groups.map((group) => ({
    group,
    part: {
      key: group.groupId ?? "none",
      label: labels.group(group.groupId, group.name) ?? tTx("uncategorized"),
      color: group.color ?? NO_CATEGORY_COLOR,
      icon: group.icon ?? NEUTRAL_ICON,
      totalMinor: group.totalMinor,
      ...(group.groupId ? { href: transactionsHref({ ...base, groupId: group.groupId }) } : {}),
    } satisfies Part,
  }));
  const parts = foldTail(
    groups.map((g) => g.part),
    DONUT_MAX_PARTS,
    (rest): Part => ({
      key: "other",
      label: t("other"),
      color: NO_CATEGORY_COLOR,
      icon: null,
      totalMinor: rest.reduce((sum, part) => sum + part.totalMinor, 0),
    }),
  );
  const top = breakdown.groups
    .flatMap((group) =>
      group.categories
        .filter((category) => category.categoryId !== null)
        .map((category) => ({ group, category })),
    )
    .sort((a, b) => b.category.totalMinor - a.category.totalMinor)
    .slice(0, TOP_CATEGORIES);

  return (
    <div className="flex flex-col gap-4">
      <ul
        aria-label={t("groupsTitle")}
        className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]"
      >
        {groups.map(({ group, part }) => (
          <li key={part.key}>
            <GroupTile
              part={part}
              locale={locale}
              share={formatRate(shareBps(part.totalMinor, breakdown.totalMinor), locale, 0)}
              saving={group.kind === "saving" ? t("savingBadge") : null}
              categories={
                group.groupId === null
                  ? []
                  : group.categories
                      .slice(0, 3)
                      .map((c) => labels.category(c.categoryId, c.name) ?? tTx("uncategorized"))
              }
            />
          </li>
        ))}
      </ul>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <section className="flex flex-col gap-3 rounded-2xl border p-4">
          <h3 className="font-medium">{t("splitTitle")}</h3>
          <div className="flex flex-wrap items-center gap-4">
            <Donut
              parts={parts}
              total={<Money amountMinor={breakdown.totalMinor} locale={locale} />}
              caption={t("thisMonth")}
            />
            <ul aria-label={t("legend")} className="flex min-w-44 flex-1 flex-col gap-1 text-sm">
              {parts.map((part) => (
                <li key={part.key}>
                  <LegendRow
                    part={part}
                    locale={locale}
                    share={formatRate(shareBps(part.totalMinor, breakdown.totalMinor), locale, 0)}
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="flex flex-col gap-1 rounded-2xl border p-4">
          <h3 className="pb-2 font-medium">{t("topCategories")}</h3>
          {top.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noCategories")}</p>
          ) : (
            <RankedBars
              label={t("topCategories")}
              locale={locale}
              className="-mx-2 text-sm"
              items={top.map(({ group, category }) => ({
                key: category.categoryId ?? "none",
                label: labels.category(category.categoryId, category.name) ?? tTx("uncategorized"),
                detail: labels.group(group.groupId, group.name) ?? undefined,
                totalMinor: category.totalMinor,
                color: paletteVar(category.color ?? NO_CATEGORY_COLOR),
                leading: <CategoryChip color={category.color} icon={category.icon} />,
                ...(category.categoryId
                  ? { href: transactionsHref({ ...base, categoryId: category.categoryId }) }
                  : {}),
              }))}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function GroupTile({
  part,
  locale,
  share,
  saving,
  categories,
}: {
  part: Part;
  locale: string;
  share: string;
  saving: string | null;
  categories: string[];
}) {
  const Icon = part.icon ? CATEGORY_ICON_COMPONENTS[part.icon] : null;
  const body = (
    <>
      <span className="flex items-center gap-2">
        {Icon && (
          <Icon
            aria-hidden
            className="size-4 shrink-0"
            style={{ color: paletteVar(part.color, "fg") }}
          />
        )}
        <span className="truncate font-medium">{part.label}</span>
        {saving && (
          <Badge variant="outline" className="ms-auto border-current/20">
            {saving}
          </Badge>
        )}
      </span>
      <span className="flex items-baseline gap-2">
        <Money
          amountMinor={part.totalMinor}
          locale={locale}
          className="text-xl font-semibold normal-nums"
        />
        <span className="text-xs text-muted-foreground">{share}</span>
      </span>
      {categories.length > 0 && (
        <span className="truncate text-xs text-muted-foreground">{categories.join(", ")}</span>
      )}
    </>
  );
  const className = "flex h-full flex-col gap-1.5 rounded-2xl p-3.5 transition-shadow";
  const style = { backgroundColor: paletteVar(part.color, "tint") };
  return part.href ? (
    <Link
      href={part.href}
      className={`${className} hover:ring-2 hover:ring-foreground/10 focus-visible:ring-2 focus-visible:ring-ring`}
      style={style}
    >
      {body}
    </Link>
  ) : (
    <div className={className} style={style}>
      {body}
    </div>
  );
}

function LegendRow({ part, locale, share }: { part: Part; locale: string; share: string }) {
  const body = (
    <>
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: paletteVar(part.color) }}
      />
      <span className="min-w-0 flex-1 truncate">{part.label}</span>
      <span className="text-xs text-muted-foreground tabular-nums">{share}</span>
      <Money
        amountMinor={part.totalMinor}
        locale={locale}
        className="w-24 text-right font-medium"
      />
    </>
  );
  const className = "flex items-center gap-2 rounded-md px-2 py-1";
  return part.href ? (
    <Link href={part.href} className={`${className} hover:bg-muted focus-visible:bg-muted`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

// The split as a ring of arcs, 2px of surface between neighbours, the total
// in the middle. Each arc names its part on hover; the legend beside it
// carries names and figures for everyone.
function Donut({ parts, total, caption }: { parts: Part[]; total: ReactNode; caption: string }) {
  // 100 units of circumference on a ~150px ring: 0.6 units ≈ 2px.
  const segments = donutSegments(parts, 0.6);
  return (
    <div className="relative size-36 shrink-0">
      {/* The legend beside it names every part with its figures. */}
      <svg viewBox="0 0 42 42" className="size-full -rotate-90" aria-hidden>
        <circle
          cx="21"
          cy="21"
          r="15.9155"
          fill="none"
          className="stroke-foreground/8"
          strokeWidth="5"
        />
        {segments.map(({ item, offset, length }) => (
          <circle
            key={item.key}
            cx="21"
            cy="21"
            r="15.9155"
            fill="none"
            stroke={paletteVar(item.color)}
            strokeWidth="5"
            strokeDasharray={`${length} ${100 - length}`}
            strokeDashoffset={-offset}
          >
            <title>{item.label}</title>
          </circle>
        ))}
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-semibold">{total}</span>
        <span className="text-xs text-muted-foreground">{caption}</span>
      </span>
    </div>
  );
}
