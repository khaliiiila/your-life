import { numbers, query, transaction } from "./db";
import type { Pagination } from "./pagination";

export type TransactionInput = { type: "expense" | "income"; walletId: string; amount: number; category: string; description?: string; date: string; note?: string };
export type TransferInput = { sourceWalletId: string; destinationWalletId: string; amount: number; fee?: number; date: string; description?: string };

export async function listTransactions(filters: { type?: string; walletId?: string; category?: string; from?: string; to?: string } = {}, pagination?: Pagination) {
  const clauses = ["TRUE"];
  const params: unknown[] = [];
  const add = (sql: string, value: string) => { params.push(value); clauses.push(`${sql} $${params.length}`); };
  if (filters.type && ["income", "expense", "adjustment"].includes(filters.type)) add("t.type =", filters.type);
  if (filters.walletId) add("t.wallet_id =", filters.walletId);
  if (filters.category) add("t.category =", filters.category);
  if (filters.from) add("t.date >=", filters.from);
  if (filters.to) add("t.date <=", filters.to);
  const where = clauses.join(" AND ");
  const total = Number((await query<{ total: string }>(`SELECT COUNT(*) AS total FROM transactions t WHERE ${where}`, params)).rows[0].total);
  let suffix = "";
  if (pagination) { params.push(pagination.pageSize, pagination.offset); suffix = ` LIMIT $${params.length - 1} OFFSET $${params.length}`; }
  const rows = (await query(`SELECT t.id,t.type,t.wallet_id,w.name AS wallet_name,t.amount,t.category,t.description,t.date,t.note FROM transactions t JOIN wallets w ON w.id=t.wallet_id WHERE ${where} ORDER BY t.date DESC,t.created_at DESC${suffix}`, params)).rows.map((row) => numbers(row, ["amount"]));
  return { rows, total };
}

export async function createTransaction(input: TransactionInput) {
  const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await query("INSERT INTO transactions (id,type,wallet_id,amount,category,description,date,note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [id, input.type, input.walletId, input.amount, input.category, input.description?.trim() || null, input.date, input.note?.trim() || null]);
  return id;
}

export async function createTransfer(input: TransferInput) {
  if (input.sourceWalletId === input.destinationWalletId) throw new Error("Wallet sumber dan tujuan harus berbeda.");
  return transaction(async (client) => {
    const wallets = await client.query("SELECT id FROM wallets WHERE id=ANY($1::text[]) FOR UPDATE", [[input.sourceWalletId, input.destinationWalletId]]);
    if (wallets.rowCount !== 2) throw new Error("Wallet sumber atau tujuan tidak ditemukan.");
    const id = `tr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const description = input.description?.trim();
    await client.query("INSERT INTO transfers (id,source_wallet_id,destination_wallet_id,amount,fee,date,description) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id, input.sourceWalletId, input.destinationWalletId, input.amount, input.fee ?? 0, input.date, description || null]);
    await client.query("INSERT INTO transactions (id,type,wallet_id,amount,category,description,date,note) VALUES ($1,'expense',$2,$3,'transfer',$4,$5,$6),($7,'income',$8,$9,'transfer',$10,$5,$6)", [`${id}_out`, input.sourceWalletId, input.amount + (input.fee ?? 0), description || "Transfer keluar", input.date, id, `${id}_in`, input.destinationWalletId, input.amount, description || "Transfer masuk"]);
    return id;
  });
}
