import { db, nowIso } from "./db";
import type { Pagination } from "./pagination";

export function listWishlists(pagination: Pagination) {
  const total = (db.prepare("SELECT COUNT(*) AS total FROM wishlists WHERE status = 'active'").get() as { total: number }).total;
  return { rows: db.prepare("SELECT * FROM wishlists WHERE status = 'active' ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, target_date IS NULL, target_date, name LIMIT ? OFFSET ?").all(pagination.pageSize, pagination.offset), total };
}

export function createWishlist(input: { name: string; targetAmount: number; savedAmount: number; priority: string; targetDate?: string; note?: string }) {
  const id = `wish_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = nowIso();
  db.prepare("INSERT INTO wishlists (id, name, target_amount, saved_amount, priority, target_date, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, input.name.trim(), input.targetAmount, input.savedAmount, input.priority, input.targetDate || null, input.note?.trim() || null, timestamp, timestamp);
  return id;
}

export function updateWishlist(id: string, savedAmount: number, status?: "active" | "purchased" | "cancelled") {
  const result = db.prepare("UPDATE wishlists SET saved_amount = ?, status = COALESCE(?, status), updated_at = ? WHERE id = ?").run(savedAmount, status || null, nowIso(), id);
  if (!result.changes) throw new Error("Wishlist tidak ditemukan.");
}

export function deleteWishlist(id: string) {
  const result = db.prepare("DELETE FROM wishlists WHERE id = ?").run(id);
  if (!result.changes) throw new Error("Wishlist tidak ditemukan.");
}
