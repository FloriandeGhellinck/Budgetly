"use client";

import { ANALYSIS_COMPARE, AnalysisCompare } from "@budgetly/contract";
import { ToggleGroup, ToggleGroupItem } from "@budgetly/ui/components/toggle-group";
import { useTranslations } from "next-intl";
import { useAnalysisNavigation } from "./navigation";

// What the total is compared with: the period just before, or a year earlier.
export function CompareToggle() {
  const t = useTranslations("analysis");
  const { view, go } = useAnalysisNavigation();
  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      spacing={0}
      aria-label={t("compareWith")}
      value={[view.compare]}
      onValueChange={(value: string[]) => {
        const compare = AnalysisCompare.safeParse(value[0]);
        if (compare.success) go({ ...view, compare: compare.data });
      }}
    >
      {ANALYSIS_COMPARE.map((mode) => (
        <ToggleGroupItem key={mode} value={mode} className="text-xs">
          {t(`compare.${mode}`)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
