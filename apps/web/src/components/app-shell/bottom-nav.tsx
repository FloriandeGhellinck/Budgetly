"use client";

import { Button } from "@expense/ui/components/button";
import { cn } from "@expense/ui/lib/utils";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEntry } from "@/components/transactions/entry-context";
import { isActive, NAV_ITEMS } from "./nav-items";

// Phone navigation: four destinations around a central "add" button, so a
// new transaction is one tap from every screen (ADR 0019).
export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { openNew } = useEntry();
  const items = NAV_ITEMS.filter((item) => item.mobile);
  const middle = Math.ceil(items.length / 2);

  const link = (item: (typeof items)[number]) => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.7rem] text-muted-foreground",
          active && "text-foreground",
        )}
      >
        <item.icon className="size-5" />
        {t(item.label)}
      </Link>
    );
  };

  return (
    <nav
      aria-label={t("main")}
      className="fixed inset-x-0 bottom-0 z-40 flex items-center border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {items.slice(0, middle).map(link)}
      <div className="flex flex-1 justify-center">
        <Button
          size="icon-lg"
          className="size-12 rounded-full shadow-md"
          aria-label={t("add")}
          onClick={() => openNew()}
        >
          <PlusIcon className="size-6" />
        </Button>
      </div>
      {items.slice(middle).map(link)}
    </nav>
  );
}
