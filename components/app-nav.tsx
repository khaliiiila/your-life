import { ArrowUpRight, BarChart3, CalendarClock, CircleDollarSign, CreditCard, Gift, LayoutDashboard, MoreHorizontal, WalletCards } from "lucide-react";
import Link from "next/link";

export function AppNav() {
  return <aside className="sidebar">
    <Link className="brand" href="/"><span className="brand-mark"><CircleDollarSign size={20} /></span><span>dompetku</span></Link>
    <nav aria-label="Navigasi utama">
      <Link className="nav-item" href="/"><LayoutDashboard size={18} />Overview</Link>
      <Link className="nav-item" href="/transactions"><ArrowUpRight size={18} />Transaksi</Link>
      <Link className="nav-item" href="/wallets"><WalletCards size={18} />Wallet</Link>
      <Link className="nav-item" href="/assets"><BarChart3 size={18} />Aset & Investasi</Link>
      <Link className="nav-item" href="/debts"><CreditCard size={18} />Utang</Link>
      <Link className="nav-item" href="/wishlists"><Gift size={18} />Wishlist</Link>
    </nav>
    <div className="sidebar-bottom"><Link className="nav-item" href="/upcoming"><CalendarClock size={18} />Akan Datang</Link><div className="profile"><div className="avatar">K</div><div><strong>Khalila</strong><small>Keuangan pribadi</small></div><MoreHorizontal size={18} /></div></div>
  </aside>;
}
