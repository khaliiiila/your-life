"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
import { AlertTriangle, Loader2 } from "lucide-react";
import { idr, formatDateShort, formatDateFull } from "@/lib/formatters";
import { AppNav } from "@/components/app-nav";
import { MobileNav } from "@/components/mobile-nav";

type AnalyticsData = {
  period: string;
  label: string;
  summary: { currentPeriod: number; previousPeriod: number };
  averages: { dailyIncome: number; dailyExpense: number; incomeAvg: number; expenseAvg: number };
  categories: { category: string; total: number }[];
  distribution: { type: string; total: number; count: number }[];
  dailyBreakdown: { date: string; type: string; total: number }[];
  worstDay: { date: string; amount: number } | null;
  dates: { date: string }[];
};

const COLORS = ["#0d7a4e", "#e99b91", "#6366f1", "#f59e0b", "#8b5cf6"];

export function AnalyticsPage() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  
  const fetchData = async (p: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${p}`);
      if (!res.ok) throw new Error("Gagal mengambil data analitik");
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => { fetchData(period); }, [period]);
  
  const getChange = (current: number, prev: number) => {
    if (prev === 0) return <span>N/A</span>;
    const diff = ((current - prev) / prev) * 100;
    const isPos = diff >= 0;
    return (
      <span className={`trend ${isPos ? "positive" : "negative"}`}>
        {isPos ? <AlertTriangle size={14} /> : <AlertTriangle size={14} />}
        {Math.abs(Math.round(diff))}%
      </span>
    );
  };
  
  const renderDailyTrend = () => {
    if (!data?.dailyBreakdown || data.dailyBreakdown.length === 0) {
      return <EmptyState>Tidak ada data harian</EmptyState>;
    }
    
    const byDate = new Map<string, { income: number; expenses: number }>();
    for (const d of data.dailyBreakdown) {
      const existing = byDate.get(d.date) || { income: 0, expenses: 0 };
      if (d.type === "income") existing.income += d.total; else existing.expenses += d.total;
      byDate.set(d.date, existing);
    }
    
    const chartData = Array.from(byDate.entries())
      .map(([date, values]) => ({ date, income: values.income, expenses: values.expenses }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return (
      <Card title="Tren Harian">
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => formatDateShort(new Date(`${v}T00:00:00`))}/>
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatCompact(v)} width={50}/>
              <RechartsTooltip formatter={(v: any) => [idr.format(v as number), "Nilai"]} labelFormatter={(l: React.ReactNode, payload: any) => { if (!payload || !payload[0]) return ""; const dateStr = payload[0].payload.date; return formatDateFull(new Date(`${dateStr}T00:00:00`)); }}/>
              <Legend verticalAlign="bottom" height={24}/>
              <Bar dataKey="income" name="Pemasukan" fill="var(--green)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  };
  
  const renderCategories = () => {
    if (!data?.categories || data.categories.length === 0) {
      return <EmptyState>Tidak ada kategori</EmptyState>;
    }
    
    const chartData = data.categories.map((cat, i) => ({
      name: cat.category, value: cat.total, fill: COLORS[i % COLORS.length],
    }));
    
    return (
      <Card title="Kategori Terbesar">
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart layout="vertical" data={chartData} margin={{ top: 8, right: 30, left: 80, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--line)"/>
              <XAxis type="number" hide/>
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={75} interval={0}/>
              <RechartsTooltip formatter={(v: any) => [idr.format(v), v]}/>
              <Legend/>
              <Bar dataKey="value" barSize={32} fill="#0d7a4e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  };
  
  const renderSummary = () => {
    if (!data) return null;
    const { summary, averages } = data;
    
    return (
      <section className="analytics-section">
        <h2 className="section-title">Ringkasan & Perbandingan</h2>
        
        <div className="summary-grid">
          <div className="stat-card">
            <div className="stat-header">
              <AlertTriangle size={18} className="text-green"/>
              <span className="stat-label">Total Pemasukan</span>
            </div>
            <strong className="stat-value">{idr.format(summary.currentPeriod)}</strong>
            <small className="stat-sub">Periode sebelumnya: {idr.format(summary.previousPeriod)}</small>
            <div className="stat-trend">{getChange(summary.currentPeriod, summary.previousPeriod)}</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-header">
              <AlertTriangle size={18} className="text-red"/>
              <span className="stat-label">Estimasi Bulanan</span>
            </div>
            <strong className="stat-value">{idr.format(averages.dailyExpense * 30)}</strong>
            <small className="stat-sub">Berdasarkan rata-rata/hari</small>
          </div>
          
          <div className="comparison-box">
            <strong>Rata-rata vs Historis</strong>
            <div className="comparison-row">
              <span>Pemasukan/hari</span>
              <span>{formatCompact(averages.dailyIncome)} vs {formatCompact(averages.incomeAvg)}</span>
            </div>
            <div className="comparison-row">
              <span>Pengeluaran/hari</span>
              <span>{formatCompact(averages.dailyExpense)} vs {formatCompact(averages.expenseAvg)}</span>
            </div>
          </div>
        </div>
        
        {data.worstDay && (
          <AlertBox severity="warning" title="Hari Paling Boros">
            <strong>{formatDateFull(new Date(`${data.worstDay.date}T00:00:00`))}</strong> - {" "}
            {idr.format(data.worstDay.amount)}
          </AlertBox>
        )}
      </section>
    );
  };
  
  return (
    <>
      <AppNav/>
      <header className="topbar"><MobileNav/><div className="topbar-actions"><button className="icon-button" aria-label="Notifikasi"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button><button className="avatar small" aria-label="Buka profil">K</button></div></header>
      
      <div className="content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">ANALITIK KEUANGAN</p>
            <h1>Laporan & Insights</h1>
            <p className="muted">Analisis pengeluaran dan pemasukan dengan pembanding rata-rata historis.</p>
          </div>
          <select className="chart-range" value={period} onChange={(e) => setPeriod(e.target.value as any)}>
            <option value="daily">Hari ini</option>
            <option value="weekly">Mingguan</option>
            <option value="monthly">Bulanan</option>
            <option value="yearly">Tahunan</option>
          </select>
        </div>
        
        {loading && (
          <div className="loading-state">
            <Loader2 className="spinner" size={32} /><p>Memuat data...</p>
          </div>
        )}
        
        {!loading && data && (
          <>
            {renderSummary()}
            {renderDailyTrend()}
            {renderCategories()}
          </>
        )}
      </div>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card analytics-card">
      <h3 className="card-title">{title}</h3>
      {children}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="empty-state">
      <AlertTriangle size={32} />
      <p>{children}</p>
    </div>
  );
}

function AlertBox({ severity, title, children }: any) {
  return (
    <div className={`alert-box alert-${severity}`}>
      <AlertTriangle size={18} />
      <strong>{title}:</strong> {children}
    </div>
  );
}

export default AnalyticsPage;

function formatCompact(num: number): string {
  if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return String(num);
}

// CSS di globals.css sudah ditambahkan sebelumnya
