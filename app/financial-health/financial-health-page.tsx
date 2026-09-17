"use client";

import { useEffect, useState } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { AlertTriangle, Loader2, TrendingUp, TrendingDown, Minus, Shield, Target, Wallet, CreditCard, PiggyBank, PieChart } from "lucide-react";
import { idr } from "@/lib/formatters";

type FinancialHealthData = {
  score: number;
  label: "Sangat Baik" | "Baik" | "Perlu Perhatian" | "Kritis";
  breakdown: {
    savingsRate: { score: number; value: number; weight: number };
    emergencyFund: { score: number; monthsCovered: number; targetMonths: number; weight: number };
    dtiRatio: { score: number; ratio: number; threshold: number; weight: number };
    netWorthGrowth: { score: number; yoyGrowth: number; weight: number };
    cashFlowStability: { score: number; volatility: number; weight: number };
  };
  assets: {
    liquid: { total: number; items: { name: string; type: string; category: string; value: number }[] };
    nonLiquid: { total: number; items: { name: string; type: string; category: string; value: number }[] };
    total: number;
  };
  upcomingImpact: {
    totalNext30Days: number;
    totalNext90Days: number;
    recurringMonthly: number;
    scoreImpact: number;
  };
  insights: { priority: "high" | "medium" | "low"; title: string; description: string }[];
};

const SCORE_COLORS = {
  "Sangat Baik": "var(--green)",
  "Baik": "#3b82f6",
  "Perlu Perhatian": "#f59e0b",
  "Kritis": "#ef4444",
};

export function FinancialHealthPage() {
  const [data, setData] = useState<FinancialHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "cashflow" | "debt" | "goals">("overview");
  const [showLiquidDetails, setShowLiquidDetails] = useState(false);
  const [showNonLiquidDetails, setShowNonLiquidDetails] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/financial-health");
      if (!res.ok) throw new Error("Gagal mengambil data");
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchData(); }, []);

  const getTrendIcon = (current: number, previous: number) => {
    if (previous === 0) return <Minus size={14} className="text-muted" />;
    return current >= previous ? <TrendingUp size={14} className="text-green" /> : <TrendingDown size={14} className="text-red" />;
  };

  const formatPercent = (v: number) => `${(v * 100).toFixed(1)}%`;
  const formatCompact = (num: number): string => {
    if (Math.abs(num) >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}M`;
    if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
    return String(num);
  };

  const renderScoreGauge = () => {
    if (!data) return null;
    const score = data.score;
    const circumference = 2 * Math.PI * 50;
    const offset = circumference - (score / 100) * circumference;
    const color = SCORE_COLORS[data.label];

    return (
      <div className="score-gauge">
        <svg width="140" height="140" className="gauge-svg">
          <circle cx="70" cy="70" r="50" stroke="var(--line)" strokeWidth="10" fill="none" />
          <circle
            cx="70"
            cy="70"
            r="50"
            stroke={color}
            strokeWidth="10"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="gauge-progress"
          />
        </svg>
        <div className="gauge-center">
          <div className="gauge-score" style={{ color }}>{score}</div>
          <div className="gauge-label">{data.label}</div>
          {data.upcomingImpact.scoreImpact > 0 && (
            <div className="gauge-penalty">
              <AlertTriangle size={12} /> Pengeluaran mendatang: -{data.upcomingImpact.scoreImpact} poin
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderKPICards = () => {
    if (!data) return null;
    const { breakdown, upcomingImpact } = data;

    return (
      <div className="summary-grid">
        <div className="stat-card">
          <div className="stat-header">
            <PiggyBank size={18} className="text-green" />
            <span className="stat-label">Dana Darurat</span>
          </div>
          <strong className="stat-value">{breakdown.emergencyFund.monthsCovered.toFixed(1)} / {breakdown.emergencyFund.targetMonths} bln</strong>
          <div className="stat-progress">
            <div
              className="progress-bar"
              style={{ width: `${Math.min(100, (breakdown.emergencyFund.monthsCovered / breakdown.emergencyFund.targetMonths) * 100)}%` }}
            />
          </div>
          <small className="stat-sub">Skor: {breakdown.emergencyFund.score}/100</small>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <Target size={18} className="text-blue" />
            <span className="stat-label">Tingkat Tabungan</span>
          </div>
          <strong className="stat-value">{formatPercent(breakdown.savingsRate.value)}</strong>
          <small className="stat-sub">Skor: {breakdown.savingsRate.score}/100</small>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <CreditCard size={18} className="text-orange" />
            <span className="stat-label">Rasio Hutang (DTI)</span>
          </div>
          <strong className="stat-value">{formatPercent(breakdown.dtiRatio.ratio)}</strong>
          <small className="stat-sub">Batas: {breakdown.dtiRatio.threshold}% | Skor: {breakdown.dtiRatio.score}/100</small>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <TrendingUp size={18} className="text-purple" />
            <span className="stat-label">Net Worth YoY</span>
          </div>
          <strong className="stat-value">{breakdown.netWorthGrowth.yoyGrowth >= 0 ? "+" : ""}{formatPercent(breakdown.netWorthGrowth.yoyGrowth)}</strong>
          <small className="stat-sub">Skor: {breakdown.netWorthGrowth.score}/100</small>
        </div>
      </div>
    );
  };

  const renderAssetBreakdown = () => {
    if (!data) return null;
    const { assets } = data;
    const liquidPct = assets.total > 0 ? (assets.liquid.total / assets.total) * 100 : 0;
    const nonLiquidPct = assets.total > 0 ? (assets.nonLiquid.total / assets.total) * 100 : 0;

    return (
      <Card title="Komposisi Aset" subtitle={`Total: ${idr.format(assets.total)}`}>
        <div className="asset-breakdown">
          <div className="asset-row">
            <div className="asset-info">
              <div className="asset-label">
                <Wallet size={16} className="text-green" />
                <span>Likuid (Kas, Bank, E-Money)</span>
              </div>
              <div className="asset-value">{idr.format(assets.liquid.total)} ({liquidPct.toFixed(1)}%)</div>
            </div>
            <button
              className="toggle-btn"
              onClick={() => setShowLiquidDetails(!showLiquidDetails)}
              aria-expanded={showLiquidDetails}
            >
              {showLiquidDetails ? "▲" : "▼"}
            </button>
          </div>
          <div className="progress-container">
            <div
              className="progress-bar progress-liquid"
              style={{ width: `${liquidPct}%` }}
            />
          </div>
          {showLiquidDetails && assets.liquid.items.length > 0 && (
            <div className="asset-details">
              {assets.liquid.items.map((item, i) => (
                <div key={i} className="asset-detail-item">
                  <span>{item.name} ({item.type})</span>
                  <strong>{idr.format(item.value)}</strong>
                </div>
              ))}
            </div>
          )}

          <div className="asset-row">
            <div className="asset-info">
              <div className="asset-label">
                <PieChart size={16} className="text-purple" />
                <span>Non-Likuid (Saham, Crypto, Emas, Properti)</span>
              </div>
              <div className="asset-value">{idr.format(assets.nonLiquid.total)} ({nonLiquidPct.toFixed(1)}%)</div>
            </div>
            <button
              className="toggle-btn"
              onClick={() => setShowNonLiquidDetails(!showNonLiquidDetails)}
              aria-expanded={showNonLiquidDetails}
            >
              {showNonLiquidDetails ? "▲" : "▼"}
            </button>
          </div>
          <div className="progress-container">
            <div
              className="progress-bar progress-nonliquid"
              style={{ width: `${nonLiquidPct}%` }}
            />
          </div>
          {showNonLiquidDetails && assets.nonLiquid.items.length > 0 && (
            <div className="asset-details">
              {assets.nonLiquid.items.map((item, i) => (
                <div key={i} className="asset-detail-item">
                  <span>{item.name} ({item.type})</span>
                  <strong>{idr.format(item.value)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    );
  };

  const renderUpcomingImpact = () => {
    if (!data) return null;
    const { upcomingImpact } = data;
    if (upcomingImpact.totalNext30Days === 0 && upcomingImpact.totalNext90Days === 0) return null;

    return (
      <Card title="Dampak Pengeluaran Mendatang" subtitle="Pengaruh terhadap skor kesehatan finansial">
        <div className="upcoming-grid">
          <div className="upcoming-item">
            <div className="upcoming-label">30 Hari Ke Depan</div>
            <div className="upcoming-value">{idr.format(upcomingImpact.totalNext30Days)}</div>
          </div>
          <div className="upcoming-item">
            <div className="upcoming-label">90 Hari Ke Depan</div>
            <div className="upcoming-value">{idr.format(upcomingImpact.totalNext90Days)}</div>
          </div>
          <div className="upcoming-item">
            <div className="upcoming-label">Berulang/Bulan</div>
            <div className="upcoming-value">{idr.format(upcomingImpact.recurringMonthly)}</div>
          </div>
          {upcomingImpact.scoreImpact > 0 && (
            <div className="upcoming-penalty">
              <AlertTriangle size={16} />
              <span>Penalti skor: -{upcomingImpact.scoreImpact} poin</span>
            </div>
          )}
        </div>
      </Card>
    );
  };

  const renderRadarChart = () => {
    if (!data) return null;
    const { breakdown } = data;
    const radarData = [
      { axis: "Tabungan", value: breakdown.savingsRate.score, fullMark: 100 },
      { axis: "Dana Darurat", value: breakdown.emergencyFund.score, fullMark: 100 },
      { axis: "Rasio Hutang", value: breakdown.dtiRatio.score, fullMark: 100 },
      { axis: "Net Worth", value: breakdown.netWorthGrowth.score, fullMark: 100 },
      { axis: "Stabilitas", value: breakdown.cashFlowStability.score, fullMark: 100 },
    ];

    return (
      <Card title="Profil Kesehatan Finansial">
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData} cx="50%" cy="50%" innerRadius={40} outerRadius={100}>
              <PolarGrid gridType="polygon" stroke="var(--line)" />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={30} tick={{ fontSize: 9 }} domain={[0, 100]} />
              <Radar
                name="Skor"
                dataKey="value"
                stroke={SCORE_COLORS[data.label]}
                fill={SCORE_COLORS[data.label]}
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <RechartsTooltip formatter={(v: any) => [v?.toString() ?? "-", "Skor"]} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="radar-legend">
          {Object.entries(breakdown).map(([key, val]) => (
            <div key={key} className="legend-item">
              <span className="legend-dot" style={{ background: SCORE_COLORS[data.label] }} />
              <span>{key.replace(/([A-Z])/g, " $1").trim()}: {val.score}/100 (bobot {val.weight}%)</span>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  const renderCashFlowChart = () => {
    if (!data) return <EmptyState>Data arus kas tidak tersedia</EmptyState>;
    return (
      <Card title="Arus Kas Harian (90 Hari Terakhir)">
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={Array.from({ length: 90 }, (_, i) => ({ day: i, value: Math.random() * 1000000 - 500000 }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="day" hide />
              <YAxis tickFormatter={(v) => formatCompact(v)} />
              <RechartsTooltip formatter={(v: any) => [v !== undefined ? idr.format(v) : "-", ""]} />
              <Bar dataKey="value" name="Net Flow" fill="#0d7a4e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="chart-note">* Data simulasi - integrasikan dengan API analytics untuk data real</p>
      </Card>
    );
  };

  const renderDebtAnalysis = () => {
    if (!data) return null;
    const { breakdown, upcomingImpact } = data;

    return (
      <div className="debt-analysis">
        <Card title="Analisis Hutang">
          <div className="debt-metrics">
            <div className="debt-metric">
              <Shield size={20} className={breakdown.dtiRatio.ratio <= breakdown.dtiRatio.threshold / 100 ? "text-green" : "text-red"} />
              <div>
                <div className="debt-metric-label">DTI Ratio</div>
                <div className="debt-metric-value">{formatPercent(breakdown.dtiRatio.ratio)}</div>
              </div>
            </div>
            <div className="debt-metric">
              <CreditCard size={20} className="text-orange" />
              <div>
                <div className="debt-metric-label">Angsuran Bulanan</div>
                <div className="debt-metric-value">{idr.format(upcomingImpact.recurringMonthly)}</div>
              </div>
            </div>
            <div className="debt-metric">
              <Target size={20} className="text-blue" />
              <div>
                <div className="debt-metric-label">Batas Aman</div>
                <div className="debt-metric-value">{breakdown.dtiRatio.threshold}%</div>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Proyeksi Pelunasan">
          <p className="muted">Fitur proyeksi pelunasan hutang akan ditambahkan berdasarkan data debts</p>
        </Card>
      </div>
    );
  };

  const renderGoals = () => {
    if (!data) return null;
    const { breakdown, assets } = data;

    return (
      <div className="goals-section">
        <Card title="Progress Dana Darurat">
          <div className="goal-progress">
            <div className="goal-header">
              <span>Target: {breakdown.emergencyFund.targetMonths} bulan pengeluaran</span>
              <span>{breakdown.emergencyFund.monthsCovered.toFixed(1)} / {breakdown.emergencyFund.targetMonths} bln</span>
            </div>
            <div className="progress-bar-lg">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(100, (breakdown.emergencyFund.monthsCovered / breakdown.emergencyFund.targetMonths) * 100)}%`,
                  background: breakdown.emergencyFund.monthsCovered >= breakdown.emergencyFund.targetMonths ? "var(--green)" : "#f59e0b",
                }}
              />
            </div>
            <div className="goal-detail">
              <span>Dana likuid tersedia: {idr.format(assets.liquid.total)}</span>
              <span>Kebutuhan bulanan: {idr.format(assets.liquid.total / Math.max(breakdown.emergencyFund.monthsCovered, 0.1))}</span>
            </div>
          </div>
        </Card>

        <Card title="Target Net Worth">
          <div className="goal-progress">
            <div className="goal-header">
              <span>Pertumbuhan YoY</span>
              <span>{breakdown.netWorthGrowth.yoyGrowth >= 0 ? "+" : ""}{formatPercent(breakdown.netWorthGrowth.yoyGrowth)}</span>
            </div>
            <div className="progress-bar-lg">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(100, Math.max(0, 50 + breakdown.netWorthGrowth.yoyGrowth * 100))}%`,
                  background: breakdown.netWorthGrowth.yoyGrowth >= 0 ? "var(--green)" : "#ef4444",
                }}
              />
            </div>
            <div className="goal-detail">
              <span>Target rekomendasi: +10-20% per tahun</span>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const renderInsights = () => {
    if (!data) return null;
    return (
      <section className="analytics-section">
        <h2 className="section-title">Insight & Rekomendasi</h2>
        <div className="insights-grid">
          {data.insights.map((insight, i) => (
            <div key={i} className={`insight-card insight-${insight.priority}`}>
              <div className="insight-icon">
                {insight.priority === "high" && <AlertTriangle size={20} className="text-red" />}
                {insight.priority === "medium" && <Target size={20} className="text-orange" />}
                {insight.priority === "low" && <Shield size={20} className="text-green" />}
              </div>
              <div className="insight-content">
                <strong>{insight.title}</strong>
                <p>{insight.description}</p>
              </div>
              <span className={`priority-badge priority-${insight.priority}`}>
                {insight.priority === "high" && "Prioritas Tinggi"}
                {insight.priority === "medium" && "Prioritas Sedang"}
                {insight.priority === "low" && "Baik"}
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  };

  if (loading) {
    return (
      <div className="loading-state">
        <Loader2 className="spinner" size={32} />
        <p>Memuat analisis kesehatan finansial...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState>
        <AlertTriangle size={32} />
        <p>Gagal memuat data kesehatan finansial</p>
      </EmptyState>
    );
  }

  return (
    <div className="content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">KESEHATAN FINANSIAL</p>
          <h1>Analisis Kondisi Keuangan</h1>
          <p className="muted">Skor komprehensif berbasis tabungan, hutang, dana darurat, aset, dan pengeluaran mendatang.</p>
        </div>
      </div>

      <div className="health-header">
        {renderScoreGauge()}
        <div className="health-summary">
          <h2>Skor Kesehatan: {data.score}/100</h2>
          <p className="muted">
            Bobot: Tabungan 25% · Dana Darurat 25% · Rasio Hutang 20% · Pertumbuhan Net Worth 15% · Stabilitas Arus Kas 15%
          </p>
          {data.upcomingImpact.scoreImpact > 0 && (
            <p className="penalty-note">
              <AlertTriangle size={14} /> Dikoreksi -{data.upcomingImpact.scoreImpact} poin akibat pengeluaran mendatang
            </p>
          )}
        </div>
      </div>

      {renderKPICards()}

      <section className="analytics-section">
        <h2 className="section-title">Komposisi Aset</h2>
        {renderAssetBreakdown()}
        {renderUpcomingImpact()}
      </section>

      <section className="analytics-section">
        <h2 className="section-title">Analisis Detail</h2>
        <div className="tabs">
          <button className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}>Overview</button>
          <button className={activeTab === "cashflow" ? "active" : ""} onClick={() => setActiveTab("cashflow")}>Arus Kas</button>
          <button className={activeTab === "debt" ? "active" : ""} onClick={() => setActiveTab("debt")}>Hutang</button>
          <button className={activeTab === "goals" ? "active" : ""} onClick={() => setActiveTab("goals")}>Target</button>
        </div>
        {activeTab === "overview" && renderRadarChart()}
        {activeTab === "cashflow" && renderCashFlowChart()}
        {activeTab === "debt" && renderDebtAnalysis()}
        {activeTab === "goals" && renderGoals()}
      </section>

      {renderInsights()}
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card analytics-card">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
      </div>
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