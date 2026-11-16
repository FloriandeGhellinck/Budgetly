"use client";

import type { AnalysisView } from "@budgetly/contract";
import { cn } from "@budgetly/ui/lib/utils";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createContext, type ReactNode, use, useMemo, useOptimistic, useTransition } from "react";
import { analysisHref } from "@/lib/analysis/view";

type Navigation = {
  // The view the controls show: the one just chosen, before the server answers.
  view: AnalysisView;
  go: (next: AnalysisView) => void;
  pending: boolean;
};

const NavigationContext = createContext<Navigation | null>(null);

// Every control changes the view in the URL (ADR 0035). The controls switch
// at once (optimistic view); only the figures wait for the server, dimmed.
export function AnalysisNavigation({
  view,
  children,
}: {
  view: AnalysisView;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(view);
  const value = useMemo<Navigation>(
    () => ({
      view: optimistic,
      pending,
      go: (next) =>
        startTransition(() => {
          setOptimistic(next);
          router.replace(analysisHref(next), { scroll: false });
        }),
    }),
    [optimistic, pending, router, setOptimistic],
  );
  return <NavigationContext value={value}>{children}</NavigationContext>;
}

export function useAnalysisNavigation(): Navigation {
  const navigation = use(NavigationContext);
  if (!navigation) throw new Error("useAnalysisNavigation outside AnalysisNavigation");
  return navigation;
}

// Dims the figures while new ones load, with a thin pulsing line on the
// card's top edge (clear of the figures printed in its corners).
export function PendingArea({ children, className }: { children: ReactNode; className?: string }) {
  const t = useTranslations("analysis");
  const { pending } = useAnalysisNavigation();
  return (
    <div aria-busy={pending} className={cn("relative", className)}>
      <div className={cn("transition-opacity duration-150", pending && "opacity-50")}>
        {children}
      </div>
      {pending && (
        <output className="absolute inset-x-6 top-0 block h-0.5">
          <span aria-hidden className="block h-full animate-pulse rounded-full bg-primary/50" />
          <span className="sr-only">{t("loading")}</span>
        </output>
      )}
    </div>
  );
}
