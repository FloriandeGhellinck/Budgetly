"use client";

import { Toaster } from "@budgetly/ui/components/sonner";
import { TooltipProvider } from "@budgetly/ui/components/tooltip";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        {children}
        <Toaster position="top-center" />
      </TooltipProvider>
    </ThemeProvider>
  );
}
