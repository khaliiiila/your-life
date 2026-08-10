import { numbers, query } from "./db";
import type { Pagination } from "./pagination";

export async function listAssets(pagination: Pagination) {
  const total = Number((await query<{ total: string }>("SELECT COUNT(*) AS total FROM assets")).rows[0].total);
  const rows = (await query("SELECT * FROM assets ORDER BY current_value DESC, name LIMIT $1 OFFSET $2", [pagination.pageSize, pagination.offset])).rows.map((row) => numbers(row, ["quantity", "purchase_value", "current_value"]));
  const summary = numbers((await query<{ value: string; gain: string; count: string }>("SELECT COALESCE(SUM(current_value),0) value,COALESCE(SUM(current_value-purchase_value),0) gain,COUNT(*) count FROM assets")).rows[0], ["value", "gain", "count"]);
  return { rows, total, summary };
}

export async function createAsset(input: { name: string; category: string; assetType: string; quantity: number; purchaseValue: number; currentValue: number; valuationDate?: string; note?: string }) {
  const id = `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await query("INSERT INTO assets (id, name, category, asset_type, quantity, purchase_value, current_value, valuation_date, note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [id, input.name.trim(), input.category, input.assetType, input.quantity, input.purchaseValue, input.currentValue, input.valuationDate || new Date().toISOString().slice(0, 10), input.note?.trim() || null]);
  return id;
}

export async function updateAssetValue(id: string, currentValue: number, valuationDate: string) {
  if (!(await query("UPDATE assets SET current_value=$1, valuation_date=$2, updated_at=NOW() WHERE id=$3", [currentValue, valuationDate, id])).rowCount) throw new Error("Aset tidak ditemukan.");
}

export async function deleteAsset(id: string) {
  if (!(await query("DELETE FROM assets WHERE id=$1", [id])).rowCount) throw new Error("Aset tidak ditemukan.");
}
