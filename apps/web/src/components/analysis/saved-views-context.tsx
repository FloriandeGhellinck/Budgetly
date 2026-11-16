"use client";

import { createContext, type ReactNode, use } from "react";
import type { SavedViewOption } from "@/lib/saved-views/server";

const SavedViewsContext = createContext<SavedViewOption[]>([]);

// The user's saved views, loaded once by the Analysis layout: a filter change
// does not refetch them; a save, rename or delete revalidates the layout.
export function SavedViewsProvider({
  views,
  children,
}: {
  views: SavedViewOption[];
  children: ReactNode;
}) {
  return <SavedViewsContext value={views}>{children}</SavedViewsContext>;
}

export function useSavedViews(): SavedViewOption[] {
  return use(SavedViewsContext);
}
