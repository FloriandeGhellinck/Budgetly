import { Money } from "@budgetly/ui/components/money";
import { formatMoney } from "@budgetly/ui/lib/money";
import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import type { Api } from "@/lib/api/server";
import { monthStart } from "@/lib/dates";
import { formatPoints, formatRate, ringShare, signedMoney } from "@/lib/reports/figures";

type Overview = Awaited<ReturnType<Api["reports"]["monthOverview"]>>;

// The month overview (ADR 0011) as the dashboard's lead card: what is left
// (net) as the hero figure, income, spending and saving under it, and the
// savings rate as a ring. Each figure keeps its change against the previous
// month in words and an arrow; on the saturated card tone is not coloured.
export async function HeroCard({ current, previous, change }: Overview) {
  const [t, locale, format] = await Promise.all([
    getTranslations("dashboard"),
    getLocale(),
    getFormatter(),
  ]);
  const monthName = format.dateTime(monthStart(current.month), { month: "long", year: "numeric" });
  const previousName = format.dateTime(monthStart(previous.month), { month: "long" });
  const moneyChange = (minor: number) => (
    <Delta sign={Math.sign(minor)}>
      {t("change", { value: formatMoney(Math.abs(minor), { locale }), month: previousName })}
    </Delta>
  );
  const rate = current.savingsRateBps;

  return (
    <section
      aria-label={t("overview")}
      className="flex flex-col gap-6 rounded-3xl bg-highlight p-5 text-highlight-foreground sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm opacity-85 first-letter:uppercase">
            {t("leftThisMonth", { month: monthName })}
          </span>
          <Money
            locale={locale}
            {...signedMoney(current.netMinor)}
            className="text-5xl leading-tight font-bold tracking-tight normal-nums"
          />
          {moneyChange(change.netMinor)}
        </div>
        <dl className="grid grid-cols-3 gap-x-5 gap-y-1">
          <Stat label={t("figures.income")} minor={current.incomeMinor} locale={locale}>
            {moneyChange(change.incomeMinor)}
          </Stat>
          <Stat label={t("figures.spending")} minor={current.spendingMinor} locale={locale}>
            {moneyChange(change.spendingMinor)}
          </Stat>
          <Stat label={t("figures.saving")} minor={current.savingMinor} locale={locale}>
            {moneyChange(change.savingMinor)}
          </Stat>
        </dl>
      </div>
      <div className="flex items-center gap-3 self-start sm:flex-col sm:self-center">
        <SavingsRing
          share={rate === null ? null : ringShare(rate)}
          label={rate === null ? t("noRate") : formatRate(rate, locale, 0)}
          caption={t("saved")}
          title={
            rate === null
              ? `${t("figures.savingsRate")}: ${t("noRate")}`
              : `${t("figures.savingsRate")}: ${formatRate(rate, locale)}`
          }
        />
        <span className="text-xs opacity-85 sm:text-center">
          {change.savingsRateBps === null
            ? t("noRateChange")
            : t("pointsChange", {
                value: formatPoints(change.savingsRateBps, locale),
                month: previousName,
              })}
        </span>
      </div>
    </section>
  );
}

function Stat({
  label,
  minor,
  locale,
  children,
}: {
  label: string;
  minor: number;
  locale: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-xs opacity-85">{label}</dt>
      <dd className="flex flex-col gap-0.5">
        <Money amountMinor={minor} locale={locale} className="text-lg font-semibold normal-nums" />
        <span className="hidden sm:block">{children}</span>
      </dd>
    </div>
  );
}

// The change line: an arrow and words, so the direction never relies on colour.
function Delta({ sign, children }: { sign: number; children: ReactNode }) {
  const Icon = sign > 0 ? ArrowUpRightIcon : sign < 0 ? ArrowDownRightIcon : MinusIcon;
  return (
    <span className="flex items-center gap-1 text-xs opacity-85">
      <Icon aria-hidden className="size-3.5 shrink-0" />
      <span className="truncate">{children}</span>
    </span>
  );
}

// The savings rate as a ring: a meter of one figure against 100 %. The track is
// the fill's own colour, lighter; the figure is printed in the middle.
function SavingsRing({
  share,
  label,
  caption,
  title,
}: {
  // 0–100, clamped; null without income (empty ring).
  share: number | null;
  label: string;
  caption: string;
  title: string;
}) {
  return (
    <span className="shrink-0">
      <span className="sr-only">{title}</span>
      <svg viewBox="0 0 42 42" aria-hidden className="size-24 sm:size-28">
        <circle
          cx="21"
          cy="21"
          r="15.9155"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="4"
        />
        {share !== null && share > 0 && (
          <circle
            cx="21"
            cy="21"
            r="15.9155"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${share} ${100 - share}`}
            strokeDashoffset="25"
          />
        )}
        <text x="21" y="21" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="currentColor">
          {label}
        </text>
        <text x="21" y="27" textAnchor="middle" fontSize="3.2" fill="currentColor" opacity="0.85">
          {caption}
        </text>
      </svg>
    </span>
  );
}
