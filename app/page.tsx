import { ArrowDownLeft, ArrowUpRight, Bell, CalendarClock, ChevronRight, MoreHorizontal, Plus, Send, WalletCards } from "lucide-react";
import { getDashboardData } from "@/lib/dashboard";
import { compactIdr, formatDate, idr } from "@/lib/formatters";
import { AppNav } from "@/components/app-nav";
import { MobileNav } from "@/components/mobile-nav";

export const dynamic = "force-dynamic";

function Card({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return <section className={`card ${className}`} id={id}>{children}</section>;
}

export default function Home() {
  const data = getDashboardData();
  const netFlow = data.flow.income - data.flow.expenses;
  const maxFlow = Math.max(data.flow.income, data.flow.expenses, 1);
  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now).toUpperCase();
  const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(now);

  return <div className="app-shell">
    <AppNav />
    <main className="main" id="main-content">
      <header className="topbar"><MobileNav /><div className="topbar-actions"><button className="icon-button" aria-label="Notifikasi"><Bell size={19} /></button><button className="avatar small" aria-label="Buka profil">K</button></div></header>
      <div className="content">
        <div className="page-heading"><div><p className="eyebrow">{dateLabel}</p><h1>Ringkasan keuangan</h1><p className="muted">Pantau aliran uang dan rencana keuanganmu.</p></div><a className="button primary" href="/transactions"><Plus size={17} />Tambah transaksi</a></div>
        <div className="summary-grid">
          <Card className="net-worth"><div className="card-label"><span>Total kekayaan bersih</span><button className="more" aria-label="Opsi kekayaan bersih"><MoreHorizontal size={18} /></button></div><strong className="hero-number">{idr.format(data.netWorth)}</strong><div className="trend positive"><ArrowUpRight size={15} />Saldo + aset + piutang - utang</div><div className="mini-bars"><i style={{ height: "40%" }} /><i style={{ height: "52%" }} /><i style={{ height: "48%" }} /><i style={{ height: "66%" }} /><i style={{ height: "58%" }} /><i style={{ height: "78%" }} /><i style={{ height: "92%" }} /></div></Card>
          <Card><div className="card-label"><span>Arus kas bulan ini</span><span className="date-chip">{monthLabel}</span></div><strong className="stat-number">{idr.format(netFlow)}</strong><div className="flow-legend"><span><i className="dot income" />Masuk {compactIdr.format(data.flow.income)}</span><span><i className="dot expense" />Keluar {compactIdr.format(data.flow.expenses)}</span></div><div className="flow-bar"><i className="income-fill" style={{ width: `${(data.flow.income / maxFlow) * 100}%` }} /><i className="expense-fill" style={{ width: `${(data.flow.expenses / maxFlow) * 100}%` }} /></div></Card>
          <Card><div className="card-label"><span>Investasi</span><span className={`trend ${data.investments.gain >= 0 ? "positive" : "negative"}`}>{data.investments.gain >= 0 ? "+" : ""}{idr.format(data.investments.gain)}</span></div><strong className="stat-number">{idr.format(data.investments.value)}</strong><p className="muted small-text">Saham, crypto, dan aset lain</p><a className="text-link" href="/assets">Lihat portofolio <ChevronRight size={15} /></a></Card>
        </div>
        <div className="section-grid">
          <Card className="wide-card"><div className="section-header"><div><h2>Saldo wallet</h2><p className="muted">Saldo terbaru di semua akun</p></div><a className="text-link" href="/wallets">Kelola wallet <ChevronRight size={15} /></a></div><div className="wallet-list">{data.wallets.slice(0, 5).map((wallet) => <div className="wallet-row" key={wallet.id}><div className={`wallet-icon ${wallet.type}`}><WalletCards size={18} /></div><div className="wallet-name"><strong>{wallet.name}</strong><small>{wallet.type === "credit" ? "Kredit / paylater" : wallet.type === "cash" ? "Tunai" : "Bank"}</small></div><strong className={wallet.balance < 0 ? "negative" : ""}>{idr.format(wallet.balance)}</strong><ChevronRight className="row-chevron" size={17} /></div>)}</div></Card>
           <Card className="upcoming-card" id="upcoming"><div className="section-header"><div><h2>Akan datang</h2><p className="muted">Kewajiban terjadwal</p></div><CalendarClock size={19} className="section-icon" /></div>{data.upcoming.length ? data.upcoming.map((item) => <div className="upcoming-row" key={item.id}><div className="calendar-date"><strong>{new Date(`${item.due_date}T00:00:00`).getDate()}</strong><small>{new Date(`${item.due_date}T00:00:00`).toLocaleDateString("id-ID", { month: "short" })}</small></div><div><strong>{item.name}</strong><small>{item.category}</small></div><strong>{idr.format(item.amount)}</strong></div>) : <div className="empty-state">Belum ada pengeluaran mendatang.</div>}<a className="button subtle full-button" href="/upcoming"><Plus size={16} />Jadwalkan pengeluaran</a></Card>
        </div>
        <Card className="transactions-card" id="transactions"><div className="section-header"><div><h2>Transaksi terbaru</h2><p className="muted">Aktivitas keuangan paling baru</p></div><a className="text-link" href="#transactions">Lihat semua <ChevronRight size={15} /></a></div><div className="transaction-list">{data.transactions.map((tx) => <div className="transaction-row" key={tx.id}><div className={`transaction-icon ${tx.type}`} >{tx.type === "income" ? <ArrowDownLeft size={18} /> : tx.type === "expense" ? <ArrowUpRight size={18} /> : <Send size={18} />}</div><div className="transaction-info"><strong>{tx.description || tx.category}</strong><small>{tx.wallet_name} · {formatDate(tx.date)}</small></div><div className="transaction-category">{tx.category}</div><strong className={tx.type === "income" ? "income-text" : "negative"}>{tx.type === "income" ? "+" : "-"}{idr.format(tx.amount)}</strong></div>)}</div></Card>
      </div>
    </main>
  </div>;
}
