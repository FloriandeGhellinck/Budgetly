import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app-shell/page-header";
import { AddTransactionButton } from "@/components/transactions/add-button";
import { getApi } from "@/lib/api/server";
import { filtersToSearch, PAGE_SIZE, parseFilters } from "@/lib/transactions/filters";
import { FilterBar } from "./filter-bar";
import { TransactionList } from "./transaction-list";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("transactions"))("title") };
}

// Filters come from the URL (ADR 0014): the server renders the first page,
// the client appends the next ones.
export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  const filters = parseFilters(await searchParams);
  const [api, t] = await Promise.all([getApi(), getTranslations("transactions")]);
  const firstPage = await api.transactions.list({ ...filters, limit: PAGE_SIZE });
  return (
    <>
      <PageHeader
        title={t("title")}
        actions={<AddTransactionButton>{t("add")}</AddTransactionButton>}
      />
      <FilterBar filters={filters} />
      <TransactionList key={filtersToSearch(filters)} filters={filters} firstPage={firstPage} />
    </>
  );
}
