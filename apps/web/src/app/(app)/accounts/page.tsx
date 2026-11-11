import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@budgetly/ui/components/card";
import { Money } from "@budgetly/ui/components/money";
import { ArrowRightIcon } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app-shell/page-header";
import { getApi } from "@/lib/api/server";
import { getEntryOptions, optionLabels } from "@/lib/entry-options";
import { AccountList } from "./account-list";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("accounts"))("title") };
}

// Accounts with real balances and transfers between them (ADR 0011, 0029).
export default async function AccountsPage() {
  const [api, t, locale, options] = await Promise.all([
    getApi(),
    getTranslations("accounts"),
    getLocale(),
    getEntryOptions(),
  ]);
  const report = await api.reports.accounts({});
  const labels = optionLabels(options);
  const name = (id: string, stored: string) => labels.account(id, stored) ?? stored;
  const storedNames = new Map(report.accounts.map((a) => [a.accountId, a.name]));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} />
      <p className="text-sm text-muted-foreground">{t("intro")}</p>
      <section aria-label={t("title")}>
        <AccountList
          accounts={report.accounts.map((a) => ({
            id: a.accountId,
            label: name(a.accountId, a.name),
            shareBps: a.shareBps,
            balanceMinor: a.balanceMinor,
            archived: a.archivedAt !== null,
          }))}
        />
        <p className="pt-2 text-xs text-muted-foreground">{t("relativeBalances")}</p>
      </section>

      {report.flows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("flowsTitle")}</CardTitle>
            <CardDescription>{t("flowsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul aria-label={t("flowsTitle")} className="flex flex-col divide-y">
              {report.flows.map((flow) => (
                <li
                  key={`${flow.fromAccountId}-${flow.toAccountId}`}
                  className="flex items-center gap-2 py-2 text-sm"
                >
                  <span className="truncate">
                    {name(flow.fromAccountId, storedNames.get(flow.fromAccountId) ?? "")}
                  </span>
                  <ArrowRightIcon
                    aria-label={t("to")}
                    className="size-3.5 shrink-0 text-muted-foreground"
                  />
                  <span className="flex-1 truncate">
                    {name(flow.toAccountId, storedNames.get(flow.toAccountId) ?? "")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("transfers", { count: flow.count })}
                  </span>
                  <Money amountMinor={flow.sentMinor} locale={locale} className="font-medium" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
