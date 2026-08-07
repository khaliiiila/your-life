import { db, nowIso } from "./db";
import type { Pagination } from "./pagination";

export function listDebts(pagination: Pagination) {
  const total = (db.prepare("SELECT COUNT(*) AS total FROM debts").get() as { total: number }).total;
  const rows = db.prepare(`
    SELECT d.id, d.name, d.direction, d.principal_amount, d.due_date, d.status, d.description,
      COALESCE(SUM(p.amount), 0) AS paid_amount,
      d.principal_amount - COALESCE(SUM(p.amount), 0) AS remaining_amount
    FROM debts d LEFT JOIN debt_payments p ON p.debt_id = d.id
    GROUP BY d.id ORDER BY CASE WHEN d.status = 'active' THEN 0 ELSE 1 END, d.due_date LIMIT ? OFFSET ?
  `).all(pagination.pageSize, pagination.offset);
  return { rows, total };
}

export function createDebt(input: { name: string; direction: "owed_by_me" | "owed_to_me"; principalAmount: number; dueDate?: string; description?: string }) {
  const id = `debt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = nowIso();
  db.prepare("INSERT INTO debts (id, name, direction, principal_amount, due_date, status, description, created_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)").run(id, input.name.trim(), input.direction, input.principalAmount, input.dueDate || null, input.description?.trim() || null, timestamp);
  return id;
}

export const payDebt = db.transaction((debtId: string, walletId: string, amount: number, date: string, note?: string) => {
  const debt = db.prepare("SELECT * FROM debts WHERE id = ? AND status = 'active'").get(debtId) as { id: string; name: string; direction: string; principal_amount: number } | undefined;
  if (!debt) throw new Error("Utang tidak ditemukan atau sudah lunas.");
  const paid = db.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM debt_payments WHERE debt_id = ?").get(debtId) as { total: number };
  if (amount > debt.principal_amount - paid.total) throw new Error("Pembayaran melebihi sisa utang.");
  if (!db.prepare("SELECT id FROM wallets WHERE id = ?").get(walletId)) throw new Error("Wallet tidak ditemukan.");
  const timestamp = nowIso();
  const transactionId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  // ponytail: no separate accounting journal, add one only if audit/export requirements exceed transaction history.
  db.prepare("INSERT INTO transactions (id, type, wallet_id, amount, category, description, date, created_at, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(transactionId, debt.direction === "owed_by_me" ? "expense" : "income", walletId, amount, "utang", debt.name, date, timestamp, note?.trim() || null);
  db.prepare("INSERT INTO debt_payments (id, debt_id, wallet_id, amount, date, note, transaction_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(`payment_${Date.now()}`, debtId, walletId, amount, date, note?.trim() || null, transactionId, timestamp);
  if (amount === debt.principal_amount - paid.total) db.prepare("UPDATE debts SET status = 'paid' WHERE id = ?").run(debtId);
  return transactionId;
});
