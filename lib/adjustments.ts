import { query } from "./db";
import { getWallet } from "./wallets";

export type AdjustInput = { walletId: string; realBalance: number; date?: string; note?: string };

export async function recordAdjustment(input: AdjustInput) {
  const wallet = await getWallet(input.walletId);
  if (!wallet) throw new Error("Wallet tidak ditemukan.");
  const difference = input.realBalance - wallet.balance;
  if (difference === 0) return { difference, balance: wallet.balance, created: false };
  const date = input.date ?? new Date().toISOString().slice(0, 10);
  const description = `Penyesuaian saldo: tercatat ${wallet.balance.toLocaleString("id-ID")}, real ${input.realBalance.toLocaleString("id-ID")}`;
  const note = input.note?.trim() || `Saldo real ${input.realBalance.toLocaleString("id-ID")}`;
  const id = `adj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await query("INSERT INTO transactions (id,type,wallet_id,amount,category,description,date,note) VALUES ($1,'adjustment',$2,$3,'penyesuaian',$4,$5,$6)", [id, input.walletId, difference, description, date, note]);
  return { id, difference, balance: input.realBalance, created: true };
}

export type AdjustmentRow = { month: string; netAdjustment: number; absAdjustment: number; count: number; volume: number; errorRate: number };

export async function getAdjustmentAnalysis(walletId: string, months = 6): Promise<AdjustmentRow[]> {
  const since = new Date(); since.setUTCDate(1); since.setUTCMonth(since.getUTCMonth() - (months - 1));
  const sinceKey = since.toISOString().slice(0, 10);
  const rows = (await query<{ month: string; net: string; abs: string; cnt: string; volume: string }>(`SELECT t.month,COALESCE(SUM(t.amount),0) net,COALESCE(SUM(ABS(t.amount)),0) abs,COUNT(*) cnt,COALESCE(v.volume,0) volume FROM (SELECT to_char(date,'YYYY-MM') AS month,amount,wallet_id FROM transactions WHERE wallet_id=$1 AND type='adjustment' AND date>=$2) t LEFT JOIN (SELECT to_char(date,'YYYY-MM') AS month,wallet_id,SUM(amount) volume FROM transactions WHERE wallet_id=$1 AND type IN ('income','expense') AND category NOT IN ('transfer','utang') GROUP BY wallet_id,to_char(date,'YYYY-MM')) v ON v.wallet_id=t.wallet_id AND v.month=t.month GROUP BY t.wallet_id,t.month,v.volume ORDER BY t.month`, [walletId, sinceKey])).rows;
  return rows.map((r) => {
    const n = Number(r.net), a = Number(r.abs), v = Number(r.volume);
    return { month: r.month, netAdjustment: n, absAdjustment: a, count: Number(r.cnt), volume: v, errorRate: v > 0 ? (a / v) * 100 : 0 };
  });
}

export async function getAdjustmentTotal(walletId: string) {
  const row = (await query<{ total: string }>("SELECT COALESCE(SUM(ABS(amount)),0) total FROM transactions WHERE wallet_id=$1 AND type='adjustment'", [walletId])).rows[0];
  return { total: Number(row.total) };
}
