import type { ReactNode } from "react";
import { SavedViewsProvider } from "@/components/analysis/saved-views-context";
import { getSavedViews } from "@/lib/saved-views/server";

// Saved views load here, not in the page: a layout is not re-rendered when
// only the search params change, so switching filters costs no extra call.
export default async function AnalysisLayout({ children }: { children: ReactNode }) {
  return <SavedViewsProvider views={await getSavedViews()}>{children}</SavedViewsProvider>;
}
