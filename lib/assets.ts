import { numbers, query } from "./db";
import type { Pagination } from "./pagination";

export async function listAssets(pagination: Pagination) {
  const total = Number((await query<{ total: string }>("SELECT COUNT(*) AS total FROM assets")).rows[0].total);
  const rows = (await query("SELECT * FROM assets ORDER BY current_value DESC, name LIMIT $1 OFFSET $2", [pagination.pageSize, pagination.offset])).rows.map((row) => numbers(row, ["quantity", "purchase_value", "current_value"]));
  const summary = numbers((await query<{ value: string; gain: string; count: string }>("SELECT COALESCE(SUM(current_value),0) value,COALESCE(SUM(current_value-purchase_value),0) gain,COUNT(*) count FROM assets")).rows[0], ["value", "gain", "count"]);
  return { rows, total, summary };
}

export async function createAsset(input: { name: string; category: string; assetType: string; quantity: number; purchaseValue: number; currentValue: number; valuationDate?: string; note?: string; ticker?: string }) {
  const id = `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const ticker = input.assetType === "stock" ? input.name.trim().toUpperCase() : input.ticker?.trim().toUpperCase() || null;
  await query("INSERT INTO assets (id, name, category, asset_type, quantity, purchase_value, current_value, valuation_date, note, ticker) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", [id, input.name.trim(), input.category, input.assetType, input.quantity, input.purchaseValue, input.currentValue, input.valuationDate || new Date().toISOString().slice(0, 10), input.note?.trim() || null, ticker]);
  return id;
}

export async function updateAssetTicker(id: string, ticker: string | null) {
  const t = ticker?.trim().toUpperCase() || null;
  if (!(await query("UPDATE assets SET ticker=$1, updated_at=NOW() WHERE id=$2", [t, id])).rowCount) throw new Error("Aset tidak ditemukan.");
}

export async function syncAssetPrices(fetchPrice: (ticker: string) => Promise<{ close: number; date: string }>) {
  const rows = (await query<{ id: string; ticker: string | null; quantity: string; asset_type: string; name: string }>("SELECT id, ticker, quantity, asset_type, name FROM assets")).rows;
  const jobs: { id: string; ticker: string; quantity: number }[] = [];
  for (const r of rows) {
    const eff = (r.ticker?.trim() || (r.asset_type === "stock" ? r.name.trim().toUpperCase() : "")) || "";
    if (!eff) continue;
    jobs.push({ id: r.id, ticker: eff, quantity: Number(r.quantity) });
  }
  // Konkurensi terbatas: 10 batch paralel (ponytail: cukup; naikkan bila portfolio besar)
  const results: { id: string; ticker: string; ok: boolean; price?: number; error?: string }[] = [];
  const BATCH = 10;
  for (let i = 0; i < jobs.length; i += BATCH) {
    const batch = jobs.slice(i, i + BATCH);
    const settled = await Promise.all(batch.map(async ({ id, ticker, quantity }) => {
      try {
        const { close, date } = await fetchPrice(ticker);
        const total = Math.round(close * quantity);
        await query("UPDATE assets SET current_value=$1, valuation_date=$2, ticker=COALESCE(ticker, CASE WHEN asset_type='stock' THEN $4 ELSE ticker END), updated_at=NOW() WHERE id=$3", [total, date, id, ticker]);
        await recordValuation(id, total, date);
        return { id, ticker, ok: true as const, price: total };
      } catch (e) {
        return { id, ticker, ok: false as const, error: e instanceof Error ? e.message : String(e) };
      }
    }));
    results.push(...settled);
  }
  return results;
}

export async function recordValuation(assetId: string, value: number, date: string) {
  // Dedup per (asset, date); pakai snapshot terbaru dari sync harian.
  await query(
    `INSERT INTO asset_valuations (id, asset_id, value, date) VALUES ($1,$2,$3,$4)
     ON CONFLICT (asset_id, date) DO UPDATE SET value=EXCLUDED.value, created_at=NOW()`,
    [`val_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, assetId, value, date],
  );
}

export async function updateAssetValue(id: string, currentValue: number, valuationDate: string) {
  if (!(await query("UPDATE assets SET current_value=$1, valuation_date=$2, updated_at=NOW() WHERE id=$3", [currentValue, valuationDate, id])).rowCount) throw new Error("Aset tidak ditemukan.");
}

export async function deleteAsset(id: string) {
  if (!(await query("DELETE FROM assets WHERE id=$1", [id])).rowCount) throw new Error("Aset tidak ditemukan.");
}
