import { numbers, query, transaction } from "./db";
import type { Pagination } from "./pagination";

export async function listDebts(pagination: Pagination) {
  const total = Number((await query<{ total: string }>("SELECT COUNT(*) AS total FROM debts")).rows[0].total);
  const rows = (await query(`SELECT d.id,d.name,d.direction,d.principal_amount,d.due_date,d.status,d.description,COALESCE(SUM(p.amount),0) AS paid_amount,d.principal_amount-COALESCE(SUM(p.amount),0) AS remaining_amount FROM debts d LEFT JOIN debt_payments p ON p.debt_id=d.id GROUP BY d.id ORDER BY CASE WHEN d.status='active' THEN 0 ELSE 1 END,d.due_date LIMIT $1 OFFSET $2`, [pagination.pageSize, pagination.offset])).rows.map((row) => numbers(row, ["principal_amount", "paid_amount", "remaining_amount"]));
  return { rows, total };
}

export async function createDebt(input: { name: string; direction: "owed_by_me" | "owed_to_me"; principalAmount: number; dueDate?: string; description?: string }) {
  const id = `debt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await query("INSERT INTO debts (id,name,direction,principal_amount,due_date,status,description) VALUES ($1,$2,$3,$4,$5,'active',$6)", [id, input.name.trim(), input.direction, input.principalAmount, input.dueDate || null, input.description?.trim() || null]);
  return id;
}

export async function payDebt(debtId: string, walletId: string, amount: number, date: string, note?: string) {
  return transaction(async (client) => {
    const debt = (await client.query<{ id: string; name: string; direction: string; principal_amount: string }>("SELECT id,name,direction,principal_amount FROM debts WHERE id=$1 AND status='active' FOR UPDATE", [debtId])).rows[0];
    if (!debt) throw new Error("Utang tidak ditemukan atau sudah lunas.");
    const paid = Number((await client.query<{ total: string }>("SELECT COALESCE(SUM(amount),0) AS total FROM debt_payments WHERE debt_id=$1", [debtId])).rows[0].total);
    const principal = Number(debt.principal_amount);
    if (amount > principal - paid) throw new Error("Pembayaran melebihi sisa utang.");
    if (!(await client.query("SELECT id FROM wallets WHERE id=$1 FOR UPDATE", [walletId])).rowCount) throw new Error("Wallet tidak ditemukan.");
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await client.query("INSERT INTO transactions (id,type,wallet_id,amount,category,description,date,note) VALUES ($1,$2,$3,$4,'utang',$5,$6,$7)", [transactionId, debt.direction === "owed_by_me" ? "expense" : "income", walletId, amount, debt.name, date, note?.trim() || null]);
    await client.query("INSERT INTO debt_payments (id,debt_id,wallet_id,amount,date,note,transaction_id) VALUES ($1,$2,$3,$4,$5,$6,$7)", [`payment_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, debtId, walletId, amount, date, note?.trim() || null, transactionId]);
    if (amount === principal - paid) await client.query("UPDATE debts SET status='paid',updated_at=NOW() WHERE id=$1", [debtId]);
    return transactionId;
  });
}
