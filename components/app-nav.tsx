"use client";

import { ArrowUpRight, BarChart3, CalendarClock, CircleDollarSign, CreditCard, Gift, LayoutDashboard, MoreHorizontal, WalletCards } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return <aside className="sidebar">
    <Link className="brand" href="/"><span className="brand-mark"><CircleDollarSign size={20} /></span><span>dompetku</span></Link>
    <nav aria-label="Navigasi utama">
      <Link className={`nav-item ${isActive("/") ? "active" : ""}`} href="/"><LayoutDashboard size={18} />Overview</Link>
      <Link className={`nav-item ${isActive("/transactions") ? "active" : ""}`} href="/transactions"><ArrowUpRight size={18} />Transaksi</Link>
      <Link className={`nav-item ${isActive("/wallets") ? "active" : ""}`} href="/wallets"><WalletCards size={18} />Wallet</Link>
      <Link className={`nav-item ${isActive("/assets") ? "active" : ""}`} href="/assets"><BarChart3 size={18} />Aset & Investasi</Link>
      <Link className={`nav-item ${isActive("/debts") ? "active" : ""}`} href="/debts"><CreditCard size={18} />Utang</Link>
      <Link className={`nav-item ${isActive("/wishlists") ? "active" : ""}`} href="/wishlists"><Gift size={18} />Wishlist</Link>
    </nav>
    <div className="sidebar-bottom">
      <Link className={`nav-item ${isActive("/upcoming") ? "active" : ""}`} href="/upcoming"><CalendarClock size={18} />Akan Datang</Link>
      <div className="profile"><div className="avatar">K</div><div><strong>Khalila</strong><small>Keuangan pribadi</small></div><MoreHorizontal size={18} /></div>
    </div>
  </aside>;
}
