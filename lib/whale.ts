import { query, transaction } from "./db";

export type WhaleStock = {
  code: string;
  status: string | null;
  color: string | null;
  net: number;
  bval: number;
  sval: number;
  bfrq: number;
  sfrq: number;
  bavg: number | null;
  savg: number | null;
  last_price: number;
  chg1d: number | null;
  fh: number | null;
  fl: number | null;
  signal: string | null;
  score: number | null;
};

export type WhaleSnapshot = {
  id: string;
  storedAt: string;
  date: string | null;
  session: string | null;
  notes: string | null;
  stocks: WhaleStock[];
  presets: Record<string, string[]>;
};

const STOCK_KEYS = [
  "code", "status", "color", "net", "bval", "sval", "bfrq", "sfrq",
  "bavg", "savg", "last_price", "chg1d", "fh", "fl", "signal", "score",
] as const;

const NUM_KEYS = new Set(["net", "bval", "sval", "bfrq", "sfrq", "bavg", "savg", "last_price", "chg1d", "fh", "fl", "score"]);

function mapRawStock(raw: Record<string, unknown>): WhaleStock {
  const out: Record<string, unknown> = {};
  for (const k of STOCK_KEYS) {
    const rawKey = k === "last_price" ? "lastPrice" : k === "fh" ? "fH" : k === "fl" ? "fL" : k;
    let v = raw[rawKey];
    if (v !== undefined && v !== null && NUM_KEYS.has(k)) v = Number(v);
    // Kolom NOT NULL berdefault: pertahankan 0 alih-alih null (ponytail: net/bval/sval/bfrq/sfrq/last_price)
    if (v === null || v === undefined) v = ["net", "bval", "sval", "bfrq", "sfrq", "last_price"].includes(k) ? 0 : null;
    out[k] = v;
  }
  return out as unknown as WhaleStock;
}

export async function ingestWhale(input: { savedAt?: string; date?: string; session?: string; notes?: string; whaleStocks?: unknown[]; bpjsStocks?: unknown[]; presets?: Record<string, unknown[]> }) {
  const savedAt = input.savedAt || new Date().toISOString();
  const date = input.date || savedAt.slice(0, 10);
  const presets = input.presets || {};
  const presetNames = Object.keys(presets).length
    ? presets
    : (() => {
        const whale = (input.whaleStocks || []) as Record<string, unknown>[];
        const bpjs = (input.bpjsStocks || []) as Record<string, unknown>[];
        const byCode = new Map<string, Record<string, unknown>>();
        for (const s of [...whale, ...bpjs]) if (s?.code) byCode.set(String(s.code), s);
        return { all: Array.from(byCode.values()).map((s) => s.code) };
      })();

  const stocksByCode = new Map<string, WhaleStock>();
  for (const raw of [...(input.whaleStocks || []), ...(input.bpjsStocks || [])]) {
    const r = raw as Record<string, unknown>;
    if (r?.code && !stocksByCode.has(String(r.code))) stocksByCode.set(String(r.code), mapRawStock(r));
  }
  const stockList = Array.from(stocksByCode.values());

  const id = `whale_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const payload = { savedAt, date, session: input.session || null, notes: input.notes || null, whaleStocks: input.whaleStocks || [], bpjsStocks: input.bpjsStocks || [], presets };
  await transaction(async (client) => {
    await client.query("INSERT INTO whale_snapshots (id, date, session, notes, payload) VALUES ($1,$2,$3,$4,$5)", [id, date, input.session || null, input.notes || null, JSON.stringify(payload)]);
    for (const s of stockList) {
      await client.query(
        `INSERT INTO whale_stock_history (snapshot_id,code,status,color,net,bval,sval,bfrq,sfrq,bavg,savg,last_price,chg1d,fh,fl,signal,score)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [id, s.code, s.status, s.color, s.net, s.bval, s.sval, s.bfrq, s.sfrq, s.bavg, s.savg, s.last_price, s.chg1d, s.fh, s.fl, s.signal, s.score],
      );
    }
    await client.query("DELETE FROM whale_snapshots WHERE id <> $1 AND stored_at < NOW() - INTERVAL '45 days'", [id]);
  });

  return { id, savedAt, date, stocks: stockList.length, presets: presetNames };
}

export async function getLatestWhaleSnapshot(): Promise<WhaleSnapshot | null> {
  const row = (await query<{ id: string; stored_at: string; date: string | null; session: string | null; notes: string | null; payload: unknown }>("SELECT id, stored_at, date, session, notes, payload FROM whale_snapshots ORDER BY stored_at DESC LIMIT 1")).rows[0];
  if (!row) return null;
  const payload = row.payload as { savedAt: string; whaleStocks: unknown[]; bpjsStocks: unknown[]; presets: Record<string, string[]> };
  const p = payload.presets || {};
  const presetCodes = new Set<string>();
  for (const list of Object.values(p)) for (const code of list) presetCodes.add(String(code));
  const rawStocks = [...(payload.whaleStocks || []), ...(payload.bpjsStocks || [])] as Record<string, unknown>[];
  const stocks: WhaleStock[] = [];
  const seen = new Set<string>();
  for (const raw of rawStocks) {
    const code = raw?.code ? String(raw.code) : "";
    if (!code || seen.has(code)) continue;
    seen.add(code);
    const base = mapRawStock(raw);
    base.code = code;
    stocks.push(base);
  }
  const presetsOut: Record<string, string[]> = {};
  for (const [name, list] of Object.entries(p)) presetsOut[name] = list.map((x) => String(x));
  const extra = Array.from(presetCodes).filter((c) => !seen.has(c));
  if (extra.length) presetsOut._extra = extra;
  return { id: row.id, storedAt: row.stored_at, date: row.date, session: row.session, notes: row.notes, stocks, presets: presetsOut };
}

export async function getWhaleStockHistory(code: string, limit = 30) {
  const rows = (await query<{ stored_at: string; status: string | null; color: string | null; net: string; bfrq: string; last_price: string; chg1d: string | null; score: string | null }>(
    `SELECT h.stored_at, s.status, s.color, s.net, s.bfrq, s.last_price, s.chg1d, s.score
     FROM whale_stock_history s JOIN whale_snapshots h ON h.id = s.snapshot_id
     WHERE s.code = $1 ORDER BY h.stored_at DESC LIMIT $2`,
    [code, limit],
  )).rows;
  return rows.map((r) => ({ storedAt: r.stored_at, status: r.status, color: r.color, net: Number(r.net), bfrq: Number(r.bfrq), last_price: Number(r.last_price), chg1d: r.chg1d === null ? null : Number(r.chg1d), score: r.score === null ? null : Number(r.score) }));
}

export function presetMeta() {
  return {
    akumulasi: { key: "bsjp_akumulasi", emoji: "🟢", label: "Akumulasi", color: "#0d7a4e" },
    hold: { key: "bsjp_hold", emoji: "🔵", label: "Hold", color: "#3b82f6" },
    distribusi: { key: "bsjp_distribusi", emoji: "🔴", label: "Distribusi", color: "#ef4444" },
    dayTrade: { key: "bpjs_day_trade", emoji: "⚡", label: "Day Trade", color: "#f59e0b" },
  };
}
