"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { LoaderCircle, Search } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { idr } from "@/lib/formatters";
import { MobileNav } from "@/components/mobile-nav";
import { ToastContainer, useToast } from "@/components/toast";

type Entry = { verdict?: string; verdict_icon?: string; current_price?: number; total?: number; flow?: { pattern?: string; composite_pct?: number } };
type Tech = { close?: number; chg_pct?: number; trend_score?: number };
type SeriesBar = { time: string; close: number };

export function StocksWorkspace() {
  const { toasts, removeToast } = useToast();
  const [query, setQuery] = useState("");
  const [ticker, setTicker] = useState("BBCA");
  const [entry, setEntry] = useState<Entry | null>(null);
  const [tech, setTech] = useState<Tech | null>(null);
  const [series, setSeries] = useState<SeriesBar[]>([]);
  const [period, setPeriod] = useState("3mo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load(t: string, p: string) {
    setLoading(true);
    setError("");
    try {
      const [eRes, seriesRes] = await Promise.all([
        fetch(`/api/assets/analysis?ticker=${encodeURIComponent(t)}`),
        fetch(`/api/bidbot-series?ticker=${encodeURIComponent(t)}&period=${p}`),
      ]);
      const eData = await eRes.json();
      if (!eRes.ok) throw new Error(eData.error || "Gagal memuat analisa.");
      setEntry(eData.entry ?? null);
      setTech(eData.technical ?? null);
      const seriesData = await seriesRes.json().catch(() => null);
      setSeries(seriesData?.bars ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { const t = window.setTimeout(() => { void load(ticker, period); }, 0); return () => window.clearTimeout(t); }, [ticker, period]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const t = query.trim().toUpperCase();
    if (t) setTicker(t);
  }

  const price = entry?.current_price ?? tech?.close ?? 0;
  const chg = tech?.chg_pct;

  return (
    <><ToastContainer toasts={toasts} onClose={removeToast} /><a className="skip-link" href="#stock-list">Lewati ke daftar saham</a><header className="mobile-page-bar"><MobileNav /></header>
      <div className="content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">PASAR MODAL</p>
            <h1>Pasar Saham</h1>
            <p className="muted">Cek analisa, tren, dan rekomendasi saham via BidBot.</p>
          </div>
        </div>

        <form onSubmit={submit} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Kode saham, mis. BBCA" style={{ flex: 1, maxWidth: 320 }} />
          <button className="button primary" type="submit"><Search size={16} />Cari</button>
        </form>
        {error && <div className="state-panel error" style={{ minHeight: 60, marginBottom: 16 }}>{error}</div>}

        <div className="asset-summary" style={{ gridTemplateColumns: "repeat(3,1fr)" } as React.CSSProperties}>
          <section className="card"><span className="card-label">Harga {ticker}</span><strong className="stat-number">{price ? idr.format(Math.round(price)) : "—"}</strong><small className={chg === null || chg === undefined ? "muted" : chg >= 0 ? "positive" : "negative"}>{chg === null || chg === undefined ? "—" : `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%`}</small></section>
          <section className="card"><span className="card-label">Sinyal</span><strong className="stat-number" style={{ fontSize: 18 }}>{entry?.verdict_icon ?? "▫️"} {entry?.verdict ?? "—"}</strong><small className="muted">skor {entry?.total ?? "—"}/97</small></section>
          <section className="card"><span className="card-label">Flow</span><strong className="stat-number" style={{ fontSize: 16 }}>{entry?.flow?.pattern ?? "—"}</strong><small className="muted">{entry?.flow?.composite_pct !== undefined ? `${entry.flow.composite_pct.toFixed(1)}% composite` : "—"}</small></section>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-header"><div><h2>Grafik harga {ticker}</h2><p className="muted">Seri harga dari BidBot</p></div>
            <div style={{ display: "flex", gap: 6 }}>{["1mo", "3mo", "6mo", "1y"].map((p) => <button key={p} className={`button ${period === p ? "primary" : "subtle"}`} style={{ minHeight: 32, padding: "0 12px", fontSize: 12 }} onClick={() => setPeriod(p)}>{p}</button>)}</div>
          </div>
          {loading ? <div className="state-panel" style={{ minHeight: 220 }}><LoaderCircle className="spin" size={20} />Memuat...</div> : series.length < 2 ? <div className="state-panel" style={{ minHeight: 220 }}>Belum ada data seri untuk {ticker}.</div> : <div style={{ height: 260 }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={series}><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0d7a4e" stopOpacity={0.28} /><stop offset="100%" stopColor="#0d7a4e" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="var(--line)" /><XAxis dataKey="time" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5, 10)} minTickGap={24} /><YAxis tick={{ fontSize: 10 }} width={52} domain={["auto", "auto"]} /><RTooltip formatter={(v: unknown) => idr.format(Number(v ?? 0))} labelFormatter={(l: unknown) => String(l ?? "")} /><Area type="monotone" dataKey="close" stroke="#0d7a4e" strokeWidth={2} fill="url(#sg)" dot={false} /></AreaChart></ResponsiveContainer></div>}
        </div>
      </div>
    </>
  );
}
