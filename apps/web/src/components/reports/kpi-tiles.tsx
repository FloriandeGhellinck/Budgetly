import { Card, CardContent, CardHeader, CardTitle } from "@budgetly/ui/components/card";
import { Money } from "@budgetly/ui/components/money";
import { formatMoney } from "@budgetly/ui/lib/money";
import { cn } from "@budgetly/ui/lib/utils";
import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import type { Api } from "@/lib/api/server";
import { monthStart } from "@/lib/dates";
import {
  changeTone,
  type Figure,
  formatPoints,
  formatRate,
  signedMoney,
  type Tone,
} from "@/lib/reports/figures";

type Overview = Awaited<ReturnType<Api["reports"]["monthOverview"]>>;

const TONE_CLASS: Record<Tone, string> = {
  good: "text-emerald-700 dark:text-emerald-400",
  bad: "text-destructive",
  neutral: "text-muted-foreground",
};

// The month overview (ADR 0011): five figures, each with its change against
// the previous month.
export async function KpiTiles({ current, previous, change }: Overview) {
  const [t, locale, format] = await Promise.all([
    getTranslations("dashboard"),
    getLocale(),
    getFormatter(),
  ]);
  const previousName = format.dateTime(monthStart(previous.month), { month: "long" });
  const money = (minor: number, signed = false) => (
    <Money locale={locale} {...(signed ? signedMoney(minor) : { amountMinor: minor })} />
  );
  const moneyChange = (figure: Figure, minor: number) => (
    <Delta tone={changeTone(figure, minor)} sign={Math.sign(minor)}>
      {t("change", { value: formatMoney(Math.abs(minor), { locale }), month: previousName })}
    </Delta>
  );

  return (
    <section aria-label={t("overview")} className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Tile label={t("figures.income")} value={money(current.incomeMinor)}>
        {moneyChange("income", change.incomeMinor)}
      </Tile>
      <Tile label={t("figures.spending")} value={money(current.spendingMinor)}>
        {moneyChange("spending", change.spendingMinor)}
      </Tile>
      <Tile label={t("figures.saving")} value={money(current.savingMinor)}>
        {moneyChange("saving", change.savingMinor)}
      </Tile>
      <Tile label={t("figures.net")} value={money(current.netMinor, true)}>
        {moneyChange("net", change.netMinor)}
      </Tile>
      <Tile
        label={t("figures.savingsRate")}
        value={
          current.savingsRateBps === null ? t("noRate") : formatRate(current.savingsRateBps, locale)
        }
        className="col-span-2 lg:col-span-1"
      >
        {change.savingsRateBps === null ? (
          <Delta tone="neutral" sign={0}>
            {t("noRateChange")}
          </Delta>
        ) : (
          <Delta
            tone={changeTone("savingsRate", change.savingsRateBps)}
            sign={Math.sign(change.savingsRateBps)}
          >
            {t("pointsChange", {
              value: formatPoints(change.savingsRateBps, locale),
              month: previousName,
            })}
          </Delta>
        )}
      </Tile>
    </section>
  );
}

function Tile({
  label,
  value,
  children,
  className,
}: {
  label: string;
  value: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card size="sm" className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-normal text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <span className="text-xl font-semibold">{value}</span>
        {children}
      </CardContent>
    </Card>
  );
}

// The change line: an arrow and words, so the tone never relies on colour.
function Delta({ tone, sign, children }: { tone: Tone; sign: number; children: ReactNode }) {
  const Icon = sign > 0 ? ArrowUpRightIcon : sign < 0 ? ArrowDownRightIcon : MinusIcon;
  return (
    <span className={cn("flex items-center gap-1 text-xs", TONE_CLASS[tone])}>
      <Icon aria-hidden className="size-3.5 shrink-0" />
      <span>{children}</span>
    </span>
  );
}
