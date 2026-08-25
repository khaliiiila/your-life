import { ArrowDownLeft, ArrowDownRight, ArrowUpRight, Bell, CalendarClock, ChevronRight, MoreHorizontal, Plus, Send, WalletCards } from "lucide-react";
import Link from "next/link";
import { getDailyCashflow, getDashboardData } from "@/lib/dashboard";
import { compactIdr, formatDate, idr } from "@/lib/formatters";
import { AppNav } from "@/components/app-nav";
import { CashflowChart } from "@/components/balance-chart";
import { MobileNav } from "@/components/mobile-nav";
import { BalanceVisibility, EyeToggle, MaskedAmount } from "@/components/balance-visibility";

export const dynamic = "force-dynamic";

function Card({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return <section className={`card ${className}`} id={id}>{children}</section>;
}

function FlowTrend({ curr, prev, goodWhenUp, label }: { curr: number; prev: number; goodWhenUp: boolean; label: string }) {
  if (!prev || curr === prev) return null;
  const up = curr > prev;
  return <span className={`trend ${up === goodWhenUp ? "positive" : "negative"}`}>{up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(Math.round(((curr - prev) / prev) * 100))}% vs {label}</span>;
}

export default async function Home() {
  const [data, cashflow] = await Promise.all([getDashboardData(), getDailyCashflow(365)]);
  const netFlow = data.flow.income - data.flow.expenses;
  const burnRate = data.flow.income > 0 ? Math.min(Math.round((data.flow.expenses / data.flow.income) * 100), 100) : data.flow.expenses > 0 ? 100 : 0;
  const maxFlow = Math.max(data.flow.income, data.flow.expenses, 1);
  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now).toUpperCase();
  const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(now);
  const prevMonthLabel = new Intl.DateTimeFormat("id-ID", { month: "short" }).format(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  // ponytail: proyeksi linear naif (rata-rata harian × hari dalam bulan), cukup untuk gambaran kasar
  const dayAvg = Math.round(data.flow.expenses / now.getDate());
  const projection = dayAvg * new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const topCategory = data.topCategory;

  return <BalanceVisibility>
    <div className="app-shell">
    <AppNav />
    <main className="main" id="main-content">
      <header className="topbar"><MobileNav /><div className="topbar-actions"><button className="icon-button" aria-label="Notifikasi"><Bell size={19} /></button><button className="avatar small" aria-label="Buka profil">K</button></div></header>
      <div className="content">
        <div className="page-heading"><div><p className="eyebrow">{dateLabel}</p><h1>Ringkasan keuangan</h1><p className="muted">Pantau aliran uang dan rencana keuanganmu.</p></div><Link className="button primary" href="/transactions"><Plus size={17} />Tambah transaksi</Link></div>
        <Card className="daily-expense" id="daily-expense">
          <div className="card-heading-row"><span className="eyebrow">Pengeluaran hari ini</span></div>
          <div className="daily-expense-body">
            <div className="daily-today">
              <MaskedAmount className="hero-number">{idr.format(data.daily.todayTotal)}</MaskedAmount>
              <EyeToggle className="icon-button" />
            </div>
            <div className="daily-compare">
              <div>
                <span className={`trend ${data.daily.todayTotal <= data.daily.lastMonthAvg ? "positive" : "negative"}`}>
                  {data.daily.todayTotal <= data.daily.lastMonthAvg ? <ArrowDownRight size={15} /> : <ArrowUpRight size={15} />}
                  {data.daily.todayTotal === 0 ? "0%" : `${Math.abs(Math.round(((data.daily.todayTotal - data.daily.lastMonthAvg) / (data.daily.lastMonthAvg || data.daily.todayTotal)) * 100))}%`}
                </span>
                <small className="muted">vs rata-rata bulan kemarin <strong>{compactIdr.format(data.daily.lastMonthAvg)}</strong></small>
              </div>
              <div>
                <span className={`trend ${data.daily.todayTotal <= data.daily.allAvg ? "positive" : "negative"}`}>
                  {data.daily.todayTotal <= data.daily.allAvg ? <ArrowDownRight size={15} /> : <ArrowUpRight size={15} />}
                  {data.daily.todayTotal === 0 ? "0%" : `${Math.abs(Math.round(((data.daily.todayTotal - data.daily.allAvg) / (data.daily.allAvg || data.daily.todayTotal)) * 100))}%`}
                </span>
                <small className="muted">vs rata-rata semua hari <strong>{compactIdr.format(data.daily.allAvg)}</strong></small>
              </div>
            </div>
          </div>
        </Card>
        <div className="summary-grid overview-summary">
          <Card><div className="card-label"><span>Pemasukan &amp; Pengeluaran</span><span className="date-chip">{monthLabel}</span></div><div className="flow-hero"><MaskedAmount className="stat-number">{idr.format(data.flow.income)}</MaskedAmount><FlowTrend curr={data.flow.income} prev={data.flow.prevIncome} goodWhenUp label={prevMonthLabel} /></div><p className="muted small-text">Uang keluar: <MaskedAmount>{idr.format(data.flow.expenses)}</MaskedAmount> <FlowTrend curr={data.flow.expenses} prev={data.flow.prevExpenses} goodWhenUp={false} label={prevMonthLabel} /></p><p className="muted small-text">Sisa: <MaskedAmount>{`${netFlow >= 0 ? "+" : "-"}${idr.format(Math.abs(netFlow))}`}</MaskedAmount></p><div className={`burn-bar${burnRate >= 85 ? " high" : ""}`} role="img" aria-label={`${burnRate}% pemasukan terpakai`}><i style={{ width: `${burnRate}%` }} /></div><small className="muted burn-note">{burnRate}% pemasukan terpakai bulan ini</small><div className="flow-stats"><div className="flow-stat"><small>Rata-rata /hari</small><MaskedAmount className="flow-stat-value">{compactIdr.format(dayAvg)}</MaskedAmount></div><div className="flow-stat"><small>Proyeksi akhir bulan</small><MaskedAmount className="flow-stat-value">{compactIdr.format(projection)}</MaskedAmount></div><div className="flow-stat"><small>Kategori terbesar</small>{topCategory && <span className="flow-stat-value">{topCategory.category} · <MaskedAmount>{compactIdr.format(topCategory.total)}</MaskedAmount></span>}</div></div></Card>
          <Card><div className="card-label"><span>Wallet Teraktif</span></div><p className="muted small-text">Paling sering dipakai pengeluaran</p><div className="active-wallets">{data.topWallets.map((w, i) => <div className="active-wallet" key={w.id}><small className="rank">{i + 1}</small><div className="wallet-name"><strong>{w.name}</strong><small>{w.cnt}&times; transaksi</small></div><MaskedAmount className="active-total">{idr.format(w.total)}</MaskedAmount></div>)}</div><Link className="text-link" href="/wallets">Kelola semua <ChevronRight size={15} /></Link></Card>
        </div>
        <Card className="wide-card balance-chart" id="balance-history"><CashflowChart {...cashflow} /></Card>
        <div className="section-grid">
          <Card className="wide-card"><div className="section-header"><div><h2>Saldo wallet</h2><p className="muted">Saldo terbaru di semua akun</p></div><Link className="text-link" href="/wallets">Kelola wallet <ChevronRight size={15} /></Link></div><div className="wallet-list">{data.wallets.slice(0, 5).map((wallet) => <Link className="wallet-row" key={wallet.id} href={`/wallets/${wallet.id}`}><div className={`wallet-icon ${wallet.type}`}><WalletCards size={18} /></div><div className="wallet-name"><strong>{wallet.name}</strong><small>{wallet.type === "credit" ? "Kredit / paylater" : wallet.type === "cash" ? "Tunai" : "Bank"}</small></div><MaskedAmount className={wallet.balance < 0 ? "negative" : ""}>{idr.format(wallet.balance)}</MaskedAmount><ChevronRight className="row-chevron" size={17} /></Link>)}</div></Card>
           <Card className="upcoming-card" id="upcoming"><div className="section-header"><div><h2>Akan datang</h2><p className="muted">Kewajiban terjadwal</p></div><CalendarClock size={19} className="section-icon" /></div>{data.upcoming.length ? data.upcoming.map((item) => <div className="upcoming-row" key={item.id}><div className="calendar-date"><strong>{new Date(`${item.due_date}T00:00:00`).getDate()}</strong><small>{new Date(`${item.due_date}T00:00:00`).toLocaleDateString("id-ID", { month: "short" })}</small></div><div><strong>{item.name}</strong><small>{item.category}</small></div><strong>{idr.format(item.amount)}</strong></div>) : <div className="empty-state">Belum ada pengeluaran mendatang.</div>}<Link className="button subtle full-button" href="/upcoming"><Plus size={16} />Jadwalkan pengeluaran</Link></Card>
        </div>
        <Card className="transactions-card" id="transactions"><div className="section-header"><div><h2>Transaksi terbaru</h2><p className="muted">Aktivitas keuangan paling baru</p></div><a className="text-link" href="#transactions">Lihat semua <ChevronRight size={15} /></a></div><div className="transaction-list">{data.transactions.map((tx) => <div className="transaction-row" key={tx.id}><div className={`transaction-icon ${tx.type}`} >{tx.type === "income" ? <ArrowDownLeft size={18} /> : tx.type === "expense" ? <ArrowUpRight size={18} /> : <Send size={18} />}</div><div className="transaction-info"><strong>{tx.description || tx.category}</strong><small>{tx.wallet_name} · {formatDate(tx.date)}</small></div><div className="transaction-category">{tx.category}</div><strong className={tx.type === "income" ? "income-text" : "negative"}>{tx.type === "income" ? "+" : "-"}{idr.format(tx.amount)}</strong></div>)}</div></Card>
      </div>
    </main>
  </div>
  </BalanceVisibility>;
}
