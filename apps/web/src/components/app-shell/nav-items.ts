import {
  ArrowLeftRightIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  SettingsIcon,
  ShapesIcon,
  TagIcon,
  WalletIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  // Key under `nav` in messages/*.json.
  label: "dashboard" | "transactions" | "accounts" | "categories" | "tags" | "settings";
  icon: LucideIcon;
  // Shown in the mobile bottom bar; the rest are reached from Settings.
  mobile: boolean;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "dashboard", icon: LayoutDashboardIcon, mobile: true },
  { href: "/transactions", label: "transactions", icon: ArrowLeftRightIcon, mobile: true },
  { href: "/accounts", label: "accounts", icon: WalletIcon, mobile: true },
  { href: "/categories", label: "categories", icon: ShapesIcon, mobile: false },
  { href: "/tags", label: "tags", icon: TagIcon, mobile: false },
  { href: "/settings", label: "settings", icon: SettingsIcon, mobile: true },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
