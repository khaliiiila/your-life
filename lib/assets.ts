import { db, nowIso } from "./db";
import type { Pagination } from "./pagination";

export function listAssets(pagination: Pagination) {
  const total = (db.prepare("SELECT COUNT(*) AS total FROM assets").get() as { total: number }).total;
  return { rows: db.prepare("SELECT * FROM assets ORDER BY current_value DESC, name LIMIT ? OFFSET ?").all(pagination.pageSize, pagination.offset), total };
}

export function createAsset(input: { name: string; category: string; assetType: string; quantity: number; purchaseValue: number; currentValue: number; valuationDate?: string; note?: string }) {
  const id = `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = nowIso();
  db.prepare("INSERT INTO assets (id, name, category, asset_type, quantity, purchase_value, current_value, valuation_date, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, input.name.trim(), input.category, input.assetType, input.quantity, input.purchaseValue, input.currentValue, input.valuationDate || new Date().toISOString().slice(0, 10), input.note?.trim() || null, timestamp, timestamp);
  return id;
}

export function updateAssetValue(id: string, currentValue: number, valuationDate: string) {
  const result = db.prepare("UPDATE assets SET current_value = ?, valuation_date = ?, updated_at = ? WHERE id = ?").run(currentValue, valuationDate, nowIso(), id);
  if (!result.changes) throw new Error("Aset tidak ditemukan.");
}

export function deleteAsset(id: string) {
  if (!db.prepare("DELETE FROM assets WHERE id = ?").run(id).changes) throw new Error("Aset tidak ditemukan.");
}
