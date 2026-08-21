"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { compactIdr, formatDate, formatDateShort, idr } from "@/lib/formatters";

type CashflowPoint = { date: string; income: number; expenses: number };
type CashflowTx = { date: string; type: string; amount: number; category: string; description: string };
type CashflowData = { points: CashflowPoint[]; transactions: CashflowTx[]; categories: string[] };
type Bucket = { date: string; total: number; txs: CashflowTx[] };

export function CashflowChart({ points, transactions, categories }: CashflowData) {
  const [range, setRange] = useState("7d");
  const [selectedCats, setSelectedCats] = useState<string[]>(() => [...categories]);

  const toggleCat = (cat: string) => {
    setSelectedCats(prev => {
      if (prev.includes(cat)) return prev.filter(c => c !== cat);
      return [...prev, cat];
    });
  };
  const selectAll = () => setSelectedCats([...categories]);
  const selectNone = () => setSelectedCats([]);

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

  const filteredTxs = useMemo(() => {
    if (selectedCats.length === categories.length) return transactions.filter(tx => tx.type === "expense");
    return transactions.filter(tx => tx.type === "expense" && selectedCats.includes(tx.category));
  }, [transactions, selectedCats, categories]);

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
    for (const tx of filteredTxs) {
      const list = map.get(tx.date) ?? [];
      list.push(tx);
      map.set(tx.date, list);
    }
    return map;
  }, [filteredTxs]);

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

      const entry = map.get(key) ?? { date: key, total: 0, txs: [] as CashflowTx[] };
      entry.total += (txByDate.get(p.date) ?? []).reduce((sum, tx) => sum + tx.amount, 0);
      entry.txs.push(...(txByDate.get(p.date) ?? []));
      map.set(key, entry);
    }

    return Array.from(map.entries()).map(([date, data]) => ({ ...data, date })).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredPoints, selectedBucket, txByDate]);

  const average = useMemo(() => {
    if (bucketedData.length === 0) return 0;
    return Math.round(bucketedData.reduce((sum, b) => sum + b.total, 0) / bucketedData.length);
  }, [bucketedData]);

  const getLabel = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(`${dateStr}T00:00:00`);
    if (selectedBucket === "day") return formatDate(dateStr);
    if (selectedBucket === "week") return formatDateShort(d);
    return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" }).toUpperCase();
  };

  return (
    <div className="balance-chart-header">
      <div className="balance-chart-top-row">
        <div>
          <h2>Pengeluaran vs Rata-rata</h2>
          <p className="muted">Pengeluaran harian dibandingkan rata-rata periode</p>
        </div>
        <select className="chart-range" value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="7d">1 minggu</option>
          <option value="30d">1 bulan</option>
          <option value="90d">3 bulan</option>
          <option value="180d">6 bulan</option>
          <option value="365d">1 tahun</option>
        </select>
      </div>
      <div className="chart-cat-filter">
        <span className="chart-cat-label">Kategori:</span>
        <button type="button" className="chart-cat-btn" onClick={selectAll}>Semua</button>
        <button type="button" className="chart-cat-btn" onClick={selectNone}>Kosongkan</button>
        {categories.map(cat => (
          <button key={cat} type="button" className={`chart-cat-btn${selectedCats.includes(cat) ? " active" : ""}`} onClick={() => toggleCat(cat)}>{cat}</button>
        ))}
      </div>
      <div className="chart-container">
        {bucketedData.length === 0 ? (
          <div className="state-panel">Belum ada data untuk periode ini.</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={bucketedData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="expense-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--red)" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="var(--red)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted)" }} tickFormatter={getLabel} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} tickFormatter={(v: number) => { if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`; if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`; return String(v); }} width={60} />
              <ReferenceLine y={average} stroke="var(--green)" strokeDasharray="6 4" strokeWidth={1.5} label={{ value: `Rata-rata ${compactIdr.format(average)}`, position: "insideTopRight", fill: "var(--green)", fontSize: 11 }} />
              <RechartsTooltip content={<ChartTooltip getLabel={getLabel} />} />
              <Area type="monotone" dataKey="total" name="Pengeluaran" stroke="var(--red)" fill="url(#expense-gradient)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, getLabel }: { active?: boolean; payload?: Array<{ payload: Bucket }>; getLabel: (d: string) => string }) {
  if (!active || !payload?.length) return null;
  const { date, total, txs } = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-head">
        <strong>{getLabel(date)}</strong>
        <span className="chart-tooltip-total">
          <i className="tt-out">{idr.format(total)}</i>
        </span>
      </div>
      {txs.length ? (
        <ul className="chart-tooltip-list">
          {txs.slice(0, 6).map((tx, i) => (
            <li key={i}>
              <span className="chart-tooltip-label">{tx.description || tx.category}</span>
              <span className="tt-amount out">−{idr.format(tx.amount)}</span>
            </li>
          ))}
          {txs.length > 6 && <li className="chart-tooltip-more">+{txs.length - 6} transaksi lainnya</li>}
        </ul>
      ) : <p className="chart-tooltip-empty">Tidak ada pengeluaran</p>}
    </div>
  );
}
