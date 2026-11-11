import { SidebarInset, SidebarProvider, SidebarTrigger } from "@budgetly/ui/components/sidebar";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { BottomNav } from "@/components/app-shell/bottom-nav";
import { EntryProvider } from "@/components/transactions/entry-context";
import { requireUser } from "@/lib/auth";
import { getEntryOptions } from "@/lib/entry-options";

// Every signed-in page: sidebar on desktop, bottom bar on phones, and one
// quick-entry dialog reachable from both.
export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireUser();
  const [options, cookieStore] = await Promise.all([getEntryOptions(), cookies()]);
  // The ui sidebar remembers its collapsed state in this cookie.
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <EntryProvider options={options}>
      <SidebarProvider defaultOpen={sidebarOpen}>
        <AppSidebar />
        <SidebarInset>
          <div className="hidden h-12 items-center px-2 md:flex">
            <SidebarTrigger />
          </div>
          <div className="mx-auto w-full max-w-4xl flex-1 px-4 pt-4 pb-24 md:pt-0 md:pb-8">
            {children}
          </div>
        </SidebarInset>
        <BottomNav />
      </SidebarProvider>
    </EntryProvider>
  );
}
