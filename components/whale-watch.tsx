"use client";

import { LoaderCircle, RefreshCw, TrendingDown, TrendingUp, X } from "lucide-react";
import { useEffect, useState } from "react";
import { idr } from "@/lib/formatters";

export type WhaleStockRow = {
  code: string;
  status: string | null;
  color: string | null;
  net: number;
  bval: number;
  sval: number;
  bfrq: number;
  sfrq: number;
  bavg: number | null;
  last_price: number;
  chg1d: number | null;
  fh: number | null;
  fl: number | null;
  signal: string | null;
  score: number | null;
};

export type WhaleData = {
  snapshot: {
    id: string;
    storedAt: string;
    date: string | null;
    session: string | null;
    notes: string | null;
    stocks: WhaleStockRow[];
    presets: Record<string, string[]>;
  };
};

const GROUPS = [
  { key: "bsjp_akumulasi", emoji: "🟢", label: "Akumulasi" },
  { key: "bsjp_hold", emoji: "🔵", label: "Hold" },
  { key: "bsjp_distribusi", emoji: "🔴", label: "Distribusi" },
  { key: "bpjs_day_trade", emoji: "⚡", label: "Day Trade" },
];

function byCode(data: WhaleData | null): Map<string, WhaleStockRow> {
  const m = new Map<string, WhaleStockRow>();
  for (const s of data?.snapshot.stocks ?? []) if (s.code) m.set(s.code, s);
  return m;
}

function fmtNet(n: number) {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  return `${(n / 1e3).toFixed(0)}K`;
}

function fmtWIB(iso: string) {
  try {
    return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
  } catch {
    return iso;
  }
}

export function WhaleWatch({ onAdd }: { onAdd: (code: string) => void }) {
  const [data, setData] = useState<WhaleData | null>(null);
  const [group, setGroup] = useState(GROUPS[0].key);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<{ code: string; rows: { storedAt: string; net: number; last_price: number; status: string | null }[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/whale");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal memuat data whale.");
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data whale.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const active = data?.snapshot.presets?.[group] ?? [];
  const map = byCode(data);

  async function openDetail(code: string) {
    setDetail(null);
    setDetailLoading(true);
    try {
      const r = await fetch(`/api/whale/history?code=${encodeURIComponent(code)}`);
      const d = await r.json();
      if (r.ok) setDetail(d);
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {GROUPS.map((g) => (
            <button key={g.key} className={`button ${group === g.key ? "primary" : "subtle"}`} style={{ fontSize: 12, minHeight: 32, padding: "0 10px" }} onClick={() => setGroup(g.key)}>
              {g.emoji} {g.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {data?.snapshot.storedAt && <span className="muted" style={{ fontSize: 11 }}>Update {fmtWIB(data.snapshot.storedAt)} WIB</span>}
          <button className="button subtle" style={{ minHeight: 30, padding: "0 10px", fontSize: 11 }} onClick={() => void load()}>
            <RefreshCw size={12} /> Segarkan
          </button>
        </div>
      </div>

      {loading ? (
        <div className="state-panel" style={{ minHeight: 140 }}><LoaderCircle className="spin" size={20} />Memuat data whale...</div>
      ) : error ? (
        <div className="state-panel muted" style={{ minHeight: 140 }}>
          <strong>Data whale belum tersedia</strong>
          <span style={{ fontSize: 12 }}>Jalankan fetch di project stock-watch (atau tunggu cron) — {error}</span>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {active.length === 0 && <div className="state-panel muted" style={{ minHeight: 100 }}>Tidak ada saham pada grup ini.</div>}
          {active.map((code) => {
            const s = map.get(code);
            const net = s?.net ?? 0;
            const chg = s?.chg1d;
            return (
              <div key={code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "var(--canvas)", borderRadius: 10, gap: 8, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <strong>{code}</strong>
                  {s?.status && <span className="muted" style={{ fontSize: 10 }}>{s.status.replaceAll("_", " ")}</span>}
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{net >= 0 ? "+" : ""}{fmtNet(net)}</span>
                  <span style={{ fontSize: 12, color: chg === null || chg === undefined ? "var(--muted)" : chg >= 0 ? "var(--positive,#0d7a4e)" : "var(--negative,#c93b3b)", display: "inline-flex", gap: 3, alignItems: "center" }}>
                    {chg === null || chg === undefined ? "—" : <>{chg >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{chg.toFixed(1)}%</>}
                  </span>
                  {s?.last_price ? <span className="muted" style={{ fontSize: 11 }}>{idr.format(Math.round(s.last_price))}</span> : null}
                  <button className="button subtle" style={{ minHeight: 28, padding: "0 10px", fontSize: 11 }} onClick={() => void openDetail(code)}>Riwayat</button>
                  <button className="button subtle" style={{ minHeight: 28, padding: "0 10px", fontSize: 11 }} onClick={() => onAdd(code)}>+ Tambah</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {detail && (
        <div style={{ marginTop: 12, padding: 12, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <strong>Riwayat {detail.code}</strong>
            <button className="icon-button" onClick={() => setDetail(null)}><X size={14} /></button>
          </div>
          {detailLoading ? (
            <div className="state-panel" style={{ minHeight: 60 }}><LoaderCircle className="spin" size={16} />Memuat...</div>
          ) : (
            <div style={{ display: "grid", gap: 4, maxHeight: 260, overflowY: "auto" }}>
              {detail.rows.map((r) => (
                <div key={r.storedAt} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "6px 8px", background: "var(--canvas)", borderRadius: 8 }}>
                  <span>{fmtWIB(r.storedAt)}</span>
                  <span className="muted" style={{ textTransform: "capitalize" }}>{r.status ?? "—"}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{idr.format(Math.round(r.last_price))}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{r.net >= 0 ? "+" : ""}{fmtNet(r.net)}</span>
                </div>
              ))}
              {detail.rows.length === 0 && <div className="state-panel muted">Belum ada riwayat.</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
