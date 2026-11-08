import { Button } from "@expense/ui/components/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { monthIndex } from "@expense/contract";
import { monthOf, monthStart, shiftMonth } from "@/lib/dates";
import { type DashboardParams, dashboardHref } from "@/lib/reports/params";

// Previous / next month, keeping the other dashboard filters. Stops at this month.
export async function MonthSwitcher({ params, now }: { params: DashboardParams; now: Date }) {
  const [t, format] = await Promise.all([getTranslations("dashboard"), getFormatter()]);
  const hasNext = monthIndex(params.month) < monthIndex(monthOf(now));
  const link = (delta: number) =>
    dashboardHref({ ...params, month: shiftMonth(params.month, delta) }, now);
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("previousMonth")}
        nativeButton={false}
        render={<Link href={link(-1)} scroll={false} />}
      >
        <ChevronLeftIcon />
      </Button>
      <h2 className="min-w-36 text-center font-medium capitalize">
        {format.dateTime(monthStart(params.month), { month: "long", year: "numeric" })}
      </h2>
      {hasNext ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("nextMonth")}
          nativeButton={false}
          render={<Link href={link(1)} scroll={false} />}
        >
          <ChevronRightIcon />
        </Button>
      ) : (
        <Button variant="ghost" size="icon-sm" aria-label={t("nextMonth")} disabled>
          <ChevronRightIcon />
        </Button>
      )}
    </div>
  );
}
