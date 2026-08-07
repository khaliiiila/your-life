import { db, nowIso } from "./db";
import type { Pagination } from "./pagination";

export type UpcomingExpenseInput = {
  name: string;
  amount: number;
  walletId?: string;
  category: string;
  dueDate: string;
  recurrence: "once" | "weekly" | "monthly" | "yearly";
  note?: string;
};

export function listUpcomingExpenses(pagination: Pagination) {
  const total = (db.prepare("SELECT COUNT(*) AS total FROM upcoming_expenses WHERE status IN ('scheduled', 'overdue')").get() as { total: number }).total;
  const rows = db.prepare(`
    SELECT e.id, e.name, e.amount, e.wallet_id, e.category, e.due_date, e.recurrence,
      e.status, e.note, w.name AS wallet_name
    FROM upcoming_expenses e LEFT JOIN wallets w ON w.id = e.wallet_id
    WHERE e.status IN ('scheduled', 'overdue')
    ORDER BY e.due_date ASC LIMIT ? OFFSET ?
  `).all(pagination.pageSize, pagination.offset);
  return { rows, total };
}

export function createUpcomingExpense(input: UpcomingExpenseInput) {
  const id = `ue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = nowIso();
  db.prepare(`INSERT INTO upcoming_expenses
    (id, name, amount, wallet_id, category, due_date, recurrence, status, note, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?)`
  ).run(id, input.name.trim(), input.amount, input.walletId || null, input.category, input.dueDate, input.recurrence, input.note?.trim() || null, createdAt, createdAt);
  return id;
}

export function updateUpcomingStatuses() {
  db.prepare("UPDATE upcoming_expenses SET status = 'overdue', updated_at = ? WHERE status = 'scheduled' AND due_date < date('now')").run(nowIso());
}

export const payUpcomingExpense = db.transaction((id: string, walletId?: string) => {
  const item = db.prepare("SELECT * FROM upcoming_expenses WHERE id = ? AND status IN ('scheduled', 'overdue')").get(id) as (UpcomingExpenseInput & { id: string; wallet_id: string | null; status: string }) | undefined;
  if (!item) throw new Error("Pengeluaran tidak ditemukan atau sudah dibayar.");
  const selectedWalletId = walletId || item.wallet_id;
  if (!selectedWalletId) throw new Error("Pilih wallet sumber sebelum membayar.");
  const wallet = db.prepare("SELECT id FROM wallets WHERE id = ?").get(selectedWalletId);
  if (!wallet) throw new Error("Wallet sumber tidak ditemukan.");
  const transactionId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = nowIso();
  db.prepare("INSERT INTO transactions (id, type, wallet_id, amount, category, description, date, created_at, note) VALUES (?, 'expense', ?, ?, ?, ?, date('now'), ?, ?)").run(transactionId, selectedWalletId, item.amount, item.category, item.name, createdAt, `upcoming:${item.id}`);
  if (item.recurrence === "once") {
    db.prepare("UPDATE upcoming_expenses SET status = 'paid', updated_at = ? WHERE id = ?").run(createdAt, item.id);
  } else {
    db.prepare("UPDATE upcoming_expenses SET due_date = CASE recurrence WHEN 'weekly' THEN date(due_date, '+7 days') WHEN 'monthly' THEN date(due_date, '+1 month') WHEN 'yearly' THEN date(due_date, '+1 year') END, status = 'scheduled', wallet_id = ?, updated_at = ? WHERE id = ?").run(selectedWalletId, createdAt, item.id);
  }
  return transactionId;
});

export function deleteUpcomingExpense(id: string) {
  const result = db.prepare("DELETE FROM upcoming_expenses WHERE id = ? AND status IN ('scheduled', 'overdue')").run(id);
  if (!result.changes) throw new Error("Pengeluaran tidak ditemukan atau sudah dibayar.");
}
