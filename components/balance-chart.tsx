"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, idr } from "@/lib/formatters";

type Point = { date: string; balance: number };

export function BalanceAreaChart({ points }: { points: Point[] }) {
  const [days, setDays] = useState(366);
  const latest = points.at(-1)?.balance;

  return (
    <div className="balance-chart-header">
      <div>
        <h2>Riwayat saldo</h2>
        <p className="muted">Saldo harian gabungan dari semua wallet</p>
      </div>
      <div className="balance-chart-header-row">
        {latest !== undefined && <strong className="balance-chart-value">{idr.format(latest)}</strong>}
        <select className="chart-range" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={30}>30 hari</option>
          <option value={90}>90 hari</option>
          <option value={180}>180 hari</option>
          <option value={366}>1 tahun</option>
        </select>
      </div>
      <div className="chart-container">
        {points.length < 2 ? (
          <div className="state-panel">Belum cukup data untuk grafik.</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={points.slice(-days)} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="balance-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--green)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--green)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted)" }} tickFormatter={(v: string) => { const d = new Date(`${v}T00:00:00`); return `${d.getDate()}/${d.getMonth() + 1}`; }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} tickFormatter={(v: number) => { if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`; if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`; return String(v); }} width={60} />
              <Tooltip formatter={(v) => [idr.format(Number(v)), "Saldo"]} labelFormatter={(label) => formatDate(String(label))} />
              <Area type="monotone" dataKey="balance" stroke="var(--green)" fill="url(#balance-gradient)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}