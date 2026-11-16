import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app-shell/page-header";
import { AnalysisFigures } from "@/components/analysis/figures";
import { AnalysisNavigation, PendingArea } from "@/components/analysis/navigation";
import { AnalysisToolbar } from "@/components/analysis/toolbar";
import { AddTransactionButton } from "@/components/transactions/add-button";
import { analysisInput, parseAnalysisView } from "@/lib/analysis/view";
import { getApi } from "@/lib/api/server";
import { dayOf } from "@/lib/dates";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("analysis"))("title") };
}

// The Analysis page (ADR 0035): the view lives in the URL, the server asks
// reports.analysis for its figures, the client controls only change the URL.
// Labels and filter options come from the layout's entry options, so a
// change costs one API call.
export default async function AnalysisPage({ searchParams }: PageProps<"/analysis">) {
  const view = parseAnalysisView(await searchParams);
  const today = dayOf(new Date());
  const input = analysisInput(view, today);
  const [api, t, tTx] = await Promise.all([
    getApi(),
    getTranslations("analysis"),
    getTranslations("transactions"),
  ]);
  const result = await api.reports.analysis(input);

  return (
    <AnalysisNavigation view={view}>
      <div className="flex flex-col gap-4">
        <PageHeader
          title={t("title")}
          actions={<AddTransactionButton>{tTx("add")}</AddTransactionButton>}
        />
        <AnalysisToolbar today={today} />
        <PendingArea>
          <AnalysisFigures
            view={view}
            result={result}
            range={{ from: input.from, to: input.to }}
            today={today}
          />
        </PendingArea>
      </div>
    </AnalysisNavigation>
  );
}
