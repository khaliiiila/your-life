import { db } from "./db";

type WalletRow = { id: string; name: string; type: string; balance: number };
type TransactionRow = { id: string; type: string; wallet_name: string; amount: number; category: string; description: string | null; date: string };

export function getBalanceHistory(days = 366) {
  const start = (db.prepare("SELECT COALESCE(SUM(starting_balance), 0) AS s FROM wallets").get() as { s: number }).s;

  const target = new Date();
  target.setDate(target.getDate() - days);
  const targetKey = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;

  const prior = (db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN type IN ('income','adjustment') THEN amount ELSE -amount END), 0) AS change
    FROM transactions WHERE date < ?
  `).get(targetKey) as { change: number }).change;

  const rows = db.prepare(`
    SELECT date, CAST(SUM(CASE WHEN type IN ('income','adjustment') THEN amount ELSE -amount END) AS INTEGER) AS change
    FROM transactions WHERE date >= ? GROUP BY date ORDER BY date
  `).all(targetKey) as Array<{ date: string; change: number }>;

  const pointMap = new Map(rows.map((r) => [r.date, r.change]));
  const cursor = new Date(target);
  const last = new Date();
  let balance = start + prior;
  const points: Array<{ date: string; balance: number }> = [];
  while (cursor <= last) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    balance += pointMap.get(key) ?? 0;
    points.push({ date: key, balance });
    cursor.setDate(cursor.getDate() + 1);
  }
  return points;
}

export function getDashboardData() {
  const wallets = db.prepare(`
    SELECT w.id, w.name, w.type,
      w.starting_balance + COALESCE(SUM(CASE WHEN t.type IN ('income','adjustment') THEN t.amount ELSE -t.amount END), 0) AS balance
    FROM wallets w LEFT JOIN transactions t ON t.wallet_id = w.id GROUP BY w.id ORDER BY balance DESC
  `).all() as WalletRow[];
  const month = new Date().toISOString().slice(0, 7);
  const flow = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses
    FROM transactions WHERE substr(date, 1, 7) = ? AND category <> 'transfer'
  `).get(month) as { income: number; expenses: number };
  const transactions = db.prepare(`
    SELECT t.id, t.type, w.name AS wallet_name, t.amount, t.category, t.description, t.date
    FROM transactions t JOIN wallets w ON w.id = t.wallet_id ORDER BY t.date DESC, t.created_at DESC LIMIT 8
  `).all() as TransactionRow[];
  const upcoming = db.prepare(`SELECT e.*, w.name AS wallet_name FROM upcoming_expenses e LEFT JOIN wallets w ON w.id = e.wallet_id WHERE e.status = 'scheduled' ORDER BY e.due_date LIMIT 4`).all() as Array<{ id: string; name: string; amount: number; due_date: string; category: string; wallet_name: string | null }>;
  const investments = db.prepare(`SELECT COALESCE(SUM(current_value), 0) AS value, COALESCE(SUM(current_value - purchase_value), 0) AS gain FROM assets`).get() as { value: number; gain: number };
  const debts = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN d.direction = 'owed_by_me' THEN d.principal_amount - COALESCE(p.paid, 0) ELSE 0 END), 0) AS owed,
      COALESCE(SUM(CASE WHEN d.direction = 'owed_to_me' THEN d.principal_amount - COALESCE(p.paid, 0) ELSE 0 END), 0) AS receivable
    FROM debts d LEFT JOIN (SELECT debt_id, SUM(amount) AS paid FROM debt_payments GROUP BY debt_id) p ON p.debt_id = d.id
    WHERE d.status = 'active'
  `).get() as { owed: number; receivable: number };
  const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
  const netWorth = totalBalance + investments.value + debts.receivable - debts.owed;
  return { wallets, flow, transactions, upcoming, investments, debts, totalBalance, netWorth, month };
}
