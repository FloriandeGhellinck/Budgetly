import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app-shell/page-header";
import { AnalysisFigures } from "@/components/analysis/figures";
import { AnalysisNavigation, PendingArea } from "@/components/analysis/navigation";
import { DraftBar, SavedViewTabs } from "@/components/analysis/saved-view-tabs";
import { AnalysisToolbar } from "@/components/analysis/toolbar";
import { AddTransactionButton } from "@/components/transactions/add-button";
import { knownIds } from "@/lib/analysis/known";
import { analysisInput, parseAnalysisLocation, pruneView } from "@/lib/analysis/view";
import { getApi } from "@/lib/api/server";
import { dayOf } from "@/lib/dates";
import { getEntryOptions } from "@/lib/entry-options";
import { getSavedViews } from "@/lib/saved-views/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("analysis"))("title") };
}

// The Analysis page (ADR 0035, 0036): the URL holds the state and the active
// tab; the server asks reports.analysis for its figures, the client controls
// only change the URL. Labels, options and saved views come from the layouts,
// so a filter change costs one API call.
export default async function AnalysisPage({ searchParams }: PageProps<"/analysis">) {
  const location = parseAnalysisLocation(await searchParams);
  let { view, savedViewId } = location;
  // No state in the URL: open the tab asked for, else the first one, as saved.
  if (!location.hasState) {
    const [saved, options] = await Promise.all([getSavedViews(), getEntryOptions()]);
    const active = savedViewId ? saved.find((v) => v.id === savedViewId) : saved[0];
    savedViewId = active?.id;
    if (active) view = pruneView(active.view, knownIds(options));
  }
  const today = dayOf(new Date());
  const input = analysisInput(view, today);
  const [api, t, tTx] = await Promise.all([
    getApi(),
    getTranslations("analysis"),
    getTranslations("transactions"),
  ]);
  const result = await api.reports.analysis(input);

  return (
    <AnalysisNavigation view={view} savedViewId={savedViewId} hasState={location.hasState}>
      <div className="flex flex-col gap-4">
        <PageHeader
          title={t("title")}
          actions={<AddTransactionButton>{tTx("add")}</AddTransactionButton>}
        />
        <SavedViewTabs />
        <AnalysisToolbar today={today} />
        <DraftBar />
        <PendingArea>
          <AnalysisFigures
            view={view}
            savedViewId={savedViewId}
            result={result}
            range={{ from: input.from, to: input.to }}
            today={today}
          />
        </PendingArea>
      </div>
    </AnalysisNavigation>
  );
}
