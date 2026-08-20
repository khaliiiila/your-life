import {
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  CreditCard,
  Gift,
  LayoutDashboard,
  Settings,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

export type NavLink = { href: string; label: string; icon: LucideIcon };

export const MAIN_LINKS: NavLink[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/transactions", label: "Transaksi", icon: ArrowUpRight },
  { href: "/wallets", label: "Wallet", icon: WalletCards },
  { href: "/analytics", label: "Analitik", icon: BarChart3 },
  { href: "/assets", label: "Aset & Investasi", icon: BarChart3 },
  { href: "/debts", label: "Utang", icon: CreditCard },
  { href: "/wishlists", label: "Wishlist", icon: Gift },
];

export const SECONDARY_LINKS: NavLink[] = [
  { href: "/upcoming", label: "Akan Datang", icon: CalendarClock },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];
