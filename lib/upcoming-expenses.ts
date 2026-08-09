import { numbers, query, transaction } from "./db";
import type { Pagination } from "./pagination";

export type UpcomingExpenseInput = { name: string; amount: number; walletId?: string; category: string; dueDate: string; recurrence: "once" | "weekly" | "monthly" | "yearly"; note?: string };

export async function listUpcomingExpenses(pagination: Pagination) {
  const total = Number((await query<{ total: string }>("SELECT COUNT(*) AS total FROM upcoming_expenses WHERE status IN ('scheduled','overdue')")).rows[0].total);
  const rows = (await query(`SELECT e.id,e.name,e.amount,e.wallet_id,e.category,e.due_date,e.recurrence,e.status,e.note,w.name AS wallet_name FROM upcoming_expenses e LEFT JOIN wallets w ON w.id=e.wallet_id WHERE e.status IN ('scheduled','overdue') ORDER BY e.due_date LIMIT $1 OFFSET $2`, [pagination.pageSize, pagination.offset])).rows.map((row) => numbers(row, ["amount"]));
  return { rows, total };
}

export async function createUpcomingExpense(input: UpcomingExpenseInput) {
  const id = `ue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await query("INSERT INTO upcoming_expenses (id,name,amount,wallet_id,category,due_date,recurrence,status,note) VALUES ($1,$2,$3,$4,$5,$6,$7,'scheduled',$8)", [id, input.name.trim(), input.amount, input.walletId || null, input.category, input.dueDate, input.recurrence, input.note?.trim() || null]);
  return id;
}

export async function updateUpcomingStatuses() {
  await query("UPDATE upcoming_expenses SET status='overdue',updated_at=NOW() WHERE status='scheduled' AND due_date<CURRENT_DATE");
}

export async function payUpcomingExpense(id: string, walletId?: string) {
  return transaction(async (client) => {
    const item = (await client.query<{ id: string; name: string; amount: string; wallet_id: string | null; category: string; recurrence: string }>("SELECT id,name,amount,wallet_id,category,recurrence FROM upcoming_expenses WHERE id=$1 AND status IN ('scheduled','overdue') FOR UPDATE", [id])).rows[0];
    if (!item) throw new Error("Pengeluaran tidak ditemukan atau sudah dibayar.");
    const selectedWalletId = walletId || item.wallet_id;
    if (!selectedWalletId) throw new Error("Pilih wallet sumber sebelum membayar.");
    if (!(await client.query("SELECT id FROM wallets WHERE id=$1 FOR UPDATE", [selectedWalletId])).rowCount) throw new Error("Wallet sumber tidak ditemukan.");
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await client.query("INSERT INTO transactions (id,type,wallet_id,amount,category,description,date,note) VALUES ($1,'expense',$2,$3,$4,$5,CURRENT_DATE,$6)", [transactionId, selectedWalletId, item.amount, item.category, item.name, `upcoming:${item.id}`]);
    if (item.recurrence === "once") await client.query("UPDATE upcoming_expenses SET status='paid',updated_at=NOW() WHERE id=$1", [id]);
    else await client.query("UPDATE upcoming_expenses SET due_date=CASE recurrence WHEN 'weekly' THEN due_date+7 WHEN 'monthly' THEN (due_date+INTERVAL '1 month')::date WHEN 'yearly' THEN (due_date+INTERVAL '1 year')::date END,status='scheduled',wallet_id=$1,updated_at=NOW() WHERE id=$2", [selectedWalletId, id]);
    return transactionId;
  });
}

export async function updateUpcomingExpense(id: string, input: UpcomingExpenseInput & { walletId?: string }) {
  const result = await query("UPDATE upcoming_expenses SET name=$1,amount=$2,wallet_id=$3,category=$4,due_date=$5,recurrence=$6,note=$7,updated_at=NOW() WHERE id=$8 AND status IN ('scheduled','overdue')", [input.name.trim(), input.amount, input.walletId || null, input.category, input.dueDate, input.recurrence, input.note?.trim() || null, id]);
  if (!result.rowCount) throw new Error("Pengeluaran tidak ditemukan atau sudah dibayar.");
}

export async function deleteUpcomingExpense(id: string) {
  if (!(await query("DELETE FROM upcoming_expenses WHERE id=$1 AND status IN ('scheduled','overdue')", [id])).rowCount) throw new Error("Pengeluaran tidak ditemukan atau sudah dibayar.");
}
