import { db, nowIso } from "./db";
import type { Pagination } from "./pagination";

export type TransactionInput = {
  type: "expense" | "income";
  walletId: string;
  amount: number;
  category: string;
  description?: string;
  date: string;
  note?: string;
};

export type TransferInput = {
  sourceWalletId: string;
  destinationWalletId: string;
  amount: number;
  fee?: number;
  date: string;
  description?: string;
};

export function listTransactions(filters: { type?: string; walletId?: string; category?: string; from?: string; to?: string } = {}, pagination?: Pagination) {
  const clauses = ["1 = 1"];
  const params: string[] = [];
  if (filters.type && ["income", "expense", "adjustment"].includes(filters.type)) { clauses.push("t.type = ?"); params.push(filters.type); }
  if (filters.walletId) { clauses.push("t.wallet_id = ?"); params.push(filters.walletId); }
  if (filters.category) { clauses.push("t.category = ?"); params.push(filters.category); }
  if (filters.from) { clauses.push("t.date >= ?"); params.push(filters.from); }
  if (filters.to) { clauses.push("t.date <= ?"); params.push(filters.to); }
  const where = clauses.join(" AND ");
  const total = (db.prepare(`SELECT COUNT(*) AS total FROM transactions t WHERE ${where}`).get(...params) as { total: number }).total;
  const rows = pagination
    ? db.prepare(`SELECT t.id, t.type, t.wallet_id, w.name AS wallet_name, t.amount, t.category, t.description, t.date, t.note FROM transactions t JOIN wallets w ON w.id = t.wallet_id WHERE ${where} ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?`).all(...params, pagination.pageSize, pagination.offset)
    : db.prepare(`SELECT t.id, t.type, t.wallet_id, w.name AS wallet_name, t.amount, t.category, t.description, t.date, t.note FROM transactions t JOIN wallets w ON w.id = t.wallet_id WHERE ${where} ORDER BY t.date DESC, t.created_at DESC`).all(...params);
  return { rows, total };
}

export function createTransaction(input: TransactionInput) {
  const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  db.prepare("INSERT INTO transactions (id, type, wallet_id, amount, category, description, date, created_at, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, input.type, input.walletId, input.amount, input.category, input.description?.trim() || null, input.date, nowIso(), input.note?.trim() || null);
  return id;
}

export const createTransfer = db.transaction((input: TransferInput) => {
  if (input.sourceWalletId === input.destinationWalletId) throw new Error("Wallet sumber dan tujuan harus berbeda.");
  const transferId = `tr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = nowIso();
  db.prepare("INSERT INTO transfers (id, source_wallet_id, destination_wallet_id, amount, fee, date, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(transferId, input.sourceWalletId, input.destinationWalletId, input.amount, input.fee ?? 0, input.date, input.description?.trim() || null, createdAt);
  db.prepare("INSERT INTO transactions (id, type, wallet_id, amount, category, description, date, created_at, note) VALUES (?, 'expense', ?, ?, 'transfer', ?, ?, ?, ?)").run(`${transferId}_out`, input.sourceWalletId, input.amount + (input.fee ?? 0), input.description?.trim() || "Transfer keluar", input.date, createdAt, transferId);
  db.prepare("INSERT INTO transactions (id, type, wallet_id, amount, category, description, date, created_at, note) VALUES (?, 'income', ?, ?, 'transfer', ?, ?, ?, ?)").run(`${transferId}_in`, input.destinationWalletId, input.amount, input.description?.trim() || "Transfer masuk", input.date, createdAt, transferId);
  return transferId;
});
