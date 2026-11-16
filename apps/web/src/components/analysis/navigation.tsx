"use client";

import type { AnalysisView } from "@budgetly/contract";
import { cn } from "@budgetly/ui/lib/utils";
import { useRouter } from "next/navigation";
import { createContext, type ReactNode, use, useMemo, useTransition } from "react";
import { analysisHref } from "@/lib/analysis/view";

type Navigation = { view: AnalysisView; go: (next: AnalysisView) => void; pending: boolean };

const NavigationContext = createContext<Navigation | null>(null);

// Every control changes the view in the URL (ADR 0035); the server renders
// the new figures while the current ones dim.
export function AnalysisNavigation({
  view,
  children,
}: {
  view: AnalysisView;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const value = useMemo<Navigation>(
    () => ({
      view,
      pending,
      go: (next) => startTransition(() => router.replace(analysisHref(next), { scroll: false })),
    }),
    [view, pending, router],
  );
  return <NavigationContext value={value}>{children}</NavigationContext>;
}

export function useAnalysisNavigation(): Navigation {
  const navigation = use(NavigationContext);
  if (!navigation) throw new Error("useAnalysisNavigation outside AnalysisNavigation");
  return navigation;
}

// Dims its content while new figures load.
export function PendingArea({ children, className }: { children: ReactNode; className?: string }) {
  const { pending } = useAnalysisNavigation();
  return (
    <div
      aria-busy={pending}
      className={cn("transition-opacity", pending && "opacity-60", className)}
    >
      {children}
    </div>
  );
}
