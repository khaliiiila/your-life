"use client";

import { ArrowDown, ArrowUp, CircleAlert, Landmark, LoaderCircle, RotateCw, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, idr } from "@/lib/formatters";
import { MobileNav } from "@/components/mobile-nav";

type WalletRow = { id: string; name: string; type: string; currency: string; starting_balance: number; balance: number };
type TX = { id: string; type: string; amount: number; category: string; description: string | null; date: string; note: string | null };
type Point = { date: string; balance: number };
type History = { name: string; startDate: string; points: Point[] };

export function WalletDetailWorkspace({ id }: { id: string }) {
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [history, setHistory] = useState<History | null>(null);
  const [transactions, setTransactions] = useState<TX[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(90);

  async function load(d: number) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/wallets/${encodeURIComponent(id)}?days=${d}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setWallet(data.wallet);
      setHistory(data.history);
      setTransactions(data.transactions);
    } catch {
      setError("Data wallet belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(days), 0);
    return () => window.clearTimeout(timer);
  }, [id, days]);

  if (loading) return <div className="content transaction-page"><div className="state-panel"><LoaderCircle className="spin" size={28} />Memuat detail wallet...</div></div>;
  if (error || !wallet) return <div className="content transaction-page"><div className="state-panel error"><CircleAlert size={28} /><strong>Gagal memuat data</strong><span>{error || "Wallet tidak ditemukan."}</span><button className="button subtle" onClick={() => void load(days)}><RotateCw size={16} />Coba lagi</button></div></div>;

  const inFlow = transactions.filter((tx) => tx.type !== "expense" || tx.category === "transfer").reduce((s, tx) => s + tx.amount, 0);
  const outFlow = transactions.filter((tx) => tx.type === "expense" && tx.category !== "transfer").reduce((s, tx) => s + tx.amount, 0);
  const chartPoints = history?.points ?? [];

  return <>
    <header className="mobile-page-bar"><MobileNav /></header>
    <div className="content transaction-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{wallet.type === "ewallet" ? "E-wallet" : wallet.type === "credit" ? "Kredit" : wallet.type}</p>
          <h1>{wallet.name}</h1>
          <p className="muted">Saldo awal {idr.format(wallet.starting_balance)} • {wallet.currency}</p>
        </div>
      </div>

      <div className="wallet-detail-summary">
        <section className="card"><span className="card-label">Saldo saat ini</span><strong className={`stat-number ${wallet.balance < 0 ? "negative" : ""}`}>{idr.format(wallet.balance)}</strong></section>
        <section className="card"><span className="card-label">Total masuk</span><strong className="stat-number positive">+{idr.format(inFlow)}</strong></section>
        <section className="card"><span className="card-label">Total keluar</span><strong className="stat-number negative">-{idr.format(outFlow)}</strong></section>
      </div>

      <section className="card chart-card">
        <div className="section-header">
          <div><h2>Riwayat saldo</h2><p className="muted">Saldo harian dari transaksi</p></div>
          <select className="chart-range" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={30}>30 hari</option>
            <option value={90}>90 hari</option>
            <option value={180}>180 hari</option>
            <option value={366}>1 tahun</option>
          </select>
        </div>
        {chartPoints.length < 2 ? (
          <div className="state-panel"><WalletCards size={24} />Belum cukup data untuk grafik.</div>
        ) : (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartPoints} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs><linearGradient id={`gradient-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--green)" stopOpacity={0.25} /><stop offset="95%" stopColor="var(--green)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted)" }} tickFormatter={(v: string) => { const d = new Date(`${v}T00:00:00`); return `${d.getDate()}/${d.getMonth() + 1}`; }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} tickFormatter={(v: number) => { if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`; if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`; return String(v); }} width={60} />
                <Tooltip formatter={(v) => [idr.format(Number(v)), "Saldo"]} labelFormatter={(label) => formatDate(String(label))} />
                <Area type="monotone" dataKey="balance" stroke="var(--green)" fill={`url(#gradient-${id})`} strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="card list-card">
        <div className="section-header">
          <div><h2>Transaksi terbaru</h2><p className="muted">{transactions.length} catatan</p></div>
        </div>
        {transactions.length === 0 ? (
          <div className="state-panel"><Landmark size={24} />Belum ada transaksi di wallet ini.</div>
        ) : (
          <div className="transaction-list">
            {transactions.map((tx) => (
              <div className={`transaction-row ${tx.type}`} key={tx.id}>
                <div className={`tx-icon ${tx.type}`}>{tx.type === "income" ? <ArrowDown size={18} /> : <ArrowUp size={18} />}</div>
                <div className="tx-info"><strong>{tx.category}</strong><small>{tx.description || "—"} · {formatDate(tx.date)}</small></div>
                <strong className={tx.type === "expense" && tx.category !== "transfer" ? "negative" : "positive"}>{tx.type === "expense" && tx.category !== "transfer" ? "-" : "+"}{idr.format(tx.amount)}</strong>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  </>;
}