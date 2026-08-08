import { db } from "./db";

export type WalletType = "cash" | "bank" | "ewallet" | "credit";

export type WalletRow = {
  id: string;
  name: string;
  type: WalletType;
  currency: string;
  starting_balance: number;
  balance: number;
};

export function getWallet(id: string): WalletRow | null {
  const row = db.prepare(`
    SELECT w.id, w.name, w.type, w.currency, w.starting_balance,
      w.starting_balance + COALESCE(SUM(CASE WHEN t.type IN ('income','adjustment') THEN t.amount ELSE -t.amount END), 0) AS balance
    FROM wallets w LEFT JOIN transactions t ON t.wallet_id = w.id
    WHERE w.id = ? GROUP BY w.id
  `).get(id) as WalletRow | undefined;
  return row ?? null;
}

export function walletRaisedTransactions(id: string, limit = 50) {
  return db.prepare(`
    SELECT t.id, t.type, t.amount, t.category, t.description, t.date, t.note
    FROM transactions t WHERE t.wallet_id = ? ORDER BY t.date DESC, t.created_at DESC LIMIT ?
  `).all(id, limit) as Array<{ id: string; type: string; amount: number; category: string; description: string | null; date: string; note: string | null }>;
}

// ponytail: daily density is built by filling gaps between cash flow days; window starts `days` ago.
export function walletHistory(id: string, days = 366) {
  const wallet = db.prepare("SELECT id, name, starting_balance FROM wallets WHERE id = ?").get(id) as { id: string; name: string; starting_balance: number } | undefined;
  if (!wallet) return null;

  const target = new Date();
  target.setDate(target.getDate() - days);
  const targetKey = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;

  const prior = (db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN type IN ('income','adjustment') THEN amount ELSE -amount END), 0) AS change
    FROM transactions WHERE wallet_id = ? AND date < ?
  `).get(id, targetKey) as { change: number }).change;

  const rows = db.prepare(`
    SELECT date, CAST(SUM(CASE WHEN type IN ('income','adjustment') THEN amount ELSE -amount END) AS INTEGER) AS change
    FROM transactions WHERE wallet_id = ? AND date >= ? GROUP BY date ORDER BY date
  `).all(id, targetKey) as Array<{ date: string; change: number }>;

  const cursor = new Date(target);
  const last = new Date();
  const pointMap = new Map(rows.map((r) => [r.date, r.change]));
  let balance = wallet.starting_balance + prior;
  const points: Array<{ date: string; balance: number }> = [];

  while (cursor <= last) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    balance += pointMap.get(key) ?? 0;
    points.push({ date: key, balance });
    cursor.setDate(cursor.getDate() + 1);
  }
  return { name: wallet.name, startDate: targetKey, points };
}