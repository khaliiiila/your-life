"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { idr } from "@/lib/formatters";

export function ValuationHistory({ assetId }: { assetId: string }) {
  const [rows, setRows] = useState<{ value: number; date: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/assets/${assetId}/valuations`)
        .then((r) => r.json())
        .then((d) => { if (alive) setRows(d.rows ?? []); })
        .catch(() => {})
        .finally(() => { if (alive) setLoading(false); });
    }, 0);
    return () => { alive = false; window.clearTimeout(t); };
  }, [assetId]);

  if (loading) return <div className="muted" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}><LoaderCircle className="spin" size={12} />Memuat riwayat valuasi...</div>;
  if (!rows.length) return <div className="muted" style={{ fontSize: 12 }}>Belum ada riwayat valuasi (terisi otomatis saat sync harga).</div>;
  return (
    <div style={{ display: "grid", gap: 4 }}>
      {rows.slice(0, 8).map((r) => (
        <div key={r.date} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 8px", background: "var(--canvas)", borderRadius: 8 }}>
          <span className="muted">{r.date}</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{idr.format(r.value)}</span>
        </div>
      ))}
    </div>
  );
}
