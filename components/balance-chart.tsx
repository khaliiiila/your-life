"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { formatDate, formatDateShort, idr } from "@/lib/formatters";

type CashflowPoint = { date: string; income: number; expenses: number };

export function CashflowChart({ points }: { points: CashflowPoint[] }) {
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

  const bucketedData = useMemo(() => {
    const map = new Map<string, { income: number; expenses: number }>();

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

      const entry = map.get(key) ?? { income: 0, expenses: 0 };
      entry.income += p.income;
      entry.expenses += p.expenses;
      map.set(key, entry);
    }

    return Array.from(map.entries()).map(([date, data]) => ({ ...data, date })).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredPoints, selectedBucket]);

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
              <RechartsTooltip formatter={(value, name) => [value !== undefined ? idr.format(Number(value)) : "0", name]} labelStyle={{ color: 'var(--ink)', fontSize: '12px' }} />
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