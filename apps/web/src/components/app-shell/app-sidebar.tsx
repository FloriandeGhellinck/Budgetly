"use client";

import { Button } from "@expense/ui/components/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@expense/ui/components/sidebar";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEntry } from "@/components/transactions/entry-context";
import { isActive, NAV_ITEMS } from "./nav-items";

// Desktop navigation (md and up); phones get BottomNav instead.
export function AppSidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { openNew } = useEntry();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <span className="px-2 py-1 text-base font-semibold group-data-[collapsible=icon]:hidden">
          expense
        </span>
        <Button onClick={() => openNew()} className="w-full justify-start gap-2">
          <PlusIcon />
          <span className="group-data-[collapsible=icon]:hidden">{t("add")}</span>
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu aria-label={t("main")}>
              {NAV_ITEMS.filter((item) => item.href !== "/settings").map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(pathname, item.href)}
                    tooltip={t(item.label)}
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{t(item.label)}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={isActive(pathname, "/settings")}
              tooltip={t("settings")}
              render={<Link href="/settings" />}
            >
              <NavIcon href="/settings" />
              <span>{t("settings")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function NavIcon({ href }: { href: string }) {
  const item = NAV_ITEMS.find((candidate) => candidate.href === href);
  return item ? <item.icon /> : null;
}
