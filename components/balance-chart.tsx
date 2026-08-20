"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { compactIdr, formatDate, formatDateShort, idr } from "@/lib/formatters";

type CashflowPoint = { date: string; income: number; expenses: number };
type CashflowTx = { date: string; type: string; amount: number; category: string; description: string };
type CashflowData = { points: CashflowPoint[]; transactions: CashflowTx[] };
type Bucket = { date: string; income: number; expenses: number; txs: CashflowTx[] };

export function CashflowChart({ points, transactions }: CashflowData) {
  const [range, setRange] = useState("7d");

  const selectedDays = useMemo(() => {
    switch (range) {
      case "30d": return 30;
      case "90d": return 90;
      case "180d": return 180;
      case "365d": return 365;
      default: return 7;
    }
  }, [range]);

  const selectedBucket = useMemo(() => {
    if (range === "365d") return "month";
    if (range === "90d" || range === "180d") return "week";
    return "day";
  }, [range]);

  const filteredPoints = useMemo(() => {
    const target = new Date();
    const start = new Date(target);
    start.setDate(start.getDate() - (selectedDays - 1));
    return points.filter(p => {
      const d = new Date(`${p.date}T00:00:00`);
      return d >= start && d <= target;
    });
  }, [points, selectedDays]);

  const txByDate = useMemo(() => {
    const map = new Map<string, CashflowTx[]>();
    for (const tx of transactions) {
      const list = map.get(tx.date) ?? [];
      list.push(tx);
      map.set(tx.date, list);
    }
    return map;
  }, [transactions]);

  const bucketedData = useMemo(() => {
    const map = new Map<string, Bucket>();

    for (const p of filteredPoints) {
      let key: string;
      if (selectedBucket === "day") {
        key = p.date;
      } else if (selectedBucket === "week") {
        const d = new Date(`${p.date}T00:00:00`);
        const day = d.getDay();
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - day);
        key = startOfWeek.toISOString().split("T")[0];
      } else {
        key = p.date.slice(0, 7);
      }

      const entry = map.get(key) ?? { date: key, income: 0, expenses: 0, txs: [] as CashflowTx[] };
      entry.income += p.income;
      entry.expenses += p.expenses;
      entry.txs.push(...(txByDate.get(p.date) ?? []));
      map.set(key, entry);
    }

    return Array.from(map.entries()).map(([date, data]) => ({ ...data, date })).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredPoints, selectedBucket, txByDate]);

  const getLabel = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(`${dateStr}T00:00:00`);
    if (selectedBucket === "day") return formatDate(dateStr);
    if (selectedBucket === "week") return formatDateShort(d);
    return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" }).toUpperCase();
  };

  return (
    <div className="balance-chart-header">
      <div>
        <h2>Pemasukan vs Pengeluaran</h2>
        <p className="muted">Arus kas harian berdasarkan semua transaksi</p>
      </div>
      <div className="balance-chart-header-row">
        <select className="chart-range" value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="7d">1 minggu</option>
          <option value="30d">1 bulan</option>
          <option value="90d">3 bulan</option>
          <option value="180d">6 bulan</option>
          <option value="365d">1 tahun</option>
        </select>
      </div>
      <div className="chart-container">
        {bucketedData.length === 0 ? (
          <div className="state-panel">Belum ada data untuk periode ini.</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={bucketedData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="income-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--green)" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="var(--green)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="expense-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--red)" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="var(--red)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted)" }} tickFormatter={getLabel} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} tickFormatter={(v: number) => { if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`; if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`; return String(v); }} width={60} />
              <RechartsTooltip content={<ChartTooltip getLabel={getLabel} />} />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Area type="monotone" dataKey="income" name="Pemasukan" stroke="var(--green)" fill="url(#income-gradient)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="expenses" name="Pengeluaran" stroke="var(--red)" fill="url(#expense-gradient)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, getLabel }: { active?: boolean; payload?: Array<{ payload: Bucket }>; getLabel: (d: string) => string }) {
  if (!active || !payload?.length) return null;
  const { date, income, expenses, txs } = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-head">
        <strong>{getLabel(date)}</strong>
        <span className="chart-tooltip-total">
          <i className="tt-in">{compactIdr.format(income)}</i>
          <i className="tt-out">{compactIdr.format(expenses)}</i>
        </span>
      </div>
      {txs.length ? (
        <ul className="chart-tooltip-list">
          {txs.slice(0, 6).map((tx, i) => (
            <li key={i}>
              <span className="chart-tooltip-label">{tx.description || tx.category}</span>
              <span className={tx.type === "income" ? "tt-amount in" : "tt-amount out"}>
                {tx.type === "income" ? "+" : "−"}{idr.format(tx.amount)}
              </span>
            </li>
          ))}
          {txs.length > 6 && <li className="chart-tooltip-more">+{txs.length - 6} transaksi lainnya</li>}
        </ul>
      ) : <p className="chart-tooltip-empty">Tidak ada transaksi</p>}
    </div>
  );
}