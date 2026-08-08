"use client";

import { ArrowUpRight, BarChart3, CalendarClock, CreditCard, Gift, LayoutDashboard, Menu, WalletCards, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const links = [
  ["/", "Overview", LayoutDashboard],
  ["/transactions", "Transaksi", ArrowUpRight],
  ["/wallets", "Wallet", WalletCards],
  ["/assets", "Aset & Investasi", BarChart3],
  ["/debts", "Utang", CreditCard],
  ["/wishlists", "Wishlist", Gift],
  ["/upcoming", "Akan Datang", CalendarClock],
] as const;

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  return <div className="mobile-brand"><button className="icon-button" aria-label="Buka navigasi" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={20} /></button><span>dompetku</span>{open && <><button className="drawer-backdrop" aria-label="Tutup navigasi" onClick={() => setOpen(false)} /><nav className="mobile-drawer" aria-label="Navigasi mobile"><div className="drawer-header"><strong>dompetku</strong><button ref={closeRef} className="icon-button" aria-label="Tutup navigasi" onClick={() => setOpen(false)}><X size={20} /></button></div>{links.map(([href, label, Icon]) => <Link className={`nav-item ${isActive(href) ? "active" : ""}`} href={href} key={href} onClick={() => setOpen(false)}><Icon size={18} />{label}</Link>)}</nav></>}</div>;
}
