import { numbers, query } from "./db";

export type WalletType = "cash" | "bank" | "ewallet" | "credit";
export type WalletRow = { id: string; name: string; type: WalletType; currency: string; starting_balance: number; balance: number };

export async function getWallet(id: string): Promise<WalletRow | null> {
  const row = (await query<WalletRow>(`SELECT w.id,w.name,w.type,w.currency,w.starting_balance,w.starting_balance+COALESCE(SUM(CASE WHEN t.type IN ('income','adjustment') THEN t.amount ELSE -t.amount END),0) AS balance FROM wallets w LEFT JOIN transactions t ON t.wallet_id=w.id WHERE w.id=$1 GROUP BY w.id`, [id])).rows[0];
  return row ? numbers(row, ["starting_balance", "balance"]) : null;
}

export async function walletRaisedTransactions(id: string, limit = 50) {
  return (await query("SELECT id,type,amount,category,description,date,note FROM transactions WHERE wallet_id=$1 ORDER BY date DESC,created_at DESC LIMIT $2", [id, limit])).rows.map((row) => numbers(row, ["amount"]));
}

export async function walletHistory(id: string, days = 366) {
  const wallet = (await query<{ name: string; starting_balance: string }>("SELECT name,starting_balance FROM wallets WHERE id=$1", [id])).rows[0];
  if (!wallet) return null;
  const target = new Date(); target.setDate(target.getDate() - days);
  const targetKey = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
  const prior = Number((await query<{ change: string }>("SELECT COALESCE(SUM(CASE WHEN type IN ('income','adjustment') THEN amount ELSE -amount END),0) AS change FROM transactions WHERE wallet_id=$1 AND date<$2", [id, targetKey])).rows[0].change);
  const rows = (await query<{ date: string; change: string }>("SELECT date::text,SUM(CASE WHEN type IN ('income','adjustment') THEN amount ELSE -amount END) AS change FROM transactions WHERE wallet_id=$1 AND date>=$2 GROUP BY date ORDER BY date", [id, targetKey])).rows;
  const pointMap = new Map(rows.map((row) => [row.date, Number(row.change)]));
  const cursor = new Date(target); const last = new Date(); let balance = Number(wallet.starting_balance) + prior; const points = [];
  while (cursor <= last) { const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`; balance += pointMap.get(key) ?? 0; points.push({ date: key, balance }); cursor.setDate(cursor.getDate() + 1); }
  return { name: wallet.name, startDate: targetKey, points };
}
