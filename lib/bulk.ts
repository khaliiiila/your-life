import { transaction } from "./db";
import type { TransactionInput } from "./transactions";

const MAX_ITEMS = 100;
const id = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function checkBatch<T>(items: T[], label: string) {
  if (!Array.isArray(items) || items.length === 0) throw new Error(`Minimal satu ${label} diperlukan.`);
  if (items.length > MAX_ITEMS) throw new Error(`Maksimal ${MAX_ITEMS} ${label} per request.`);
}

export async function createBulkWallets(items: { name: string; type: "cash" | "bank" | "ewallet" | "credit"; startingBalance: number }[]) {
  checkBatch(items, "wallet");
  return transaction(async (client) => {
    const ids: string[] = [];
    for (const item of items) {
      if (!item.name?.trim() || !["cash", "bank", "ewallet", "credit"].includes(item.type) || !Number.isInteger(item.startingBalance)) throw new Error("Data wallet tidak valid.");
      const walletId = id("wallet");
      await client.query("INSERT INTO wallets (id,name,starting_balance,currency,type) VALUES ($1,$2,$3,'IDR',$4)", [walletId, item.name.trim(), item.startingBalance, item.type]);
      ids.push(walletId);
    }
    return { ids, count: ids.length };
  });
}

export async function createBulkTransactions(items: TransactionInput[]) {
  checkBatch(items, "transaksi");
  return transaction(async (client) => {
    const ids: string[] = [];
    for (const item of items) {
      if (!["income", "expense"].includes(item.type) || !item.walletId || !item.category || !item.date || !Number.isInteger(item.amount) || item.amount <= 0) throw new Error("Data transaksi tidak valid.");
      if (!(await client.query("SELECT 1 FROM wallets WHERE id=$1", [item.walletId])).rowCount) throw new Error("Wallet transaksi tidak ditemukan.");
      const transactionId = id("tx");
      await client.query("INSERT INTO transactions (id,type,wallet_id,amount,category,description,date,note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [transactionId, item.type, item.walletId, item.amount, item.category, item.description?.trim() || null, item.date, item.note?.trim() || null]);
      ids.push(transactionId);
    }
    return { ids, count: ids.length };
  });
}

export async function createBulkDebts(items: { name: string; direction: "owed_by_me" | "owed_to_me"; principalAmount: number; dueDate?: string; description?: string }[]) {
  checkBatch(items, "utang");
  return transaction(async (client) => {
    const ids: string[] = [];
    for (const item of items) {
      if (!item.name?.trim() || !["owed_by_me", "owed_to_me"].includes(item.direction) || !Number.isInteger(item.principalAmount) || item.principalAmount <= 0) throw new Error("Data utang tidak valid.");
      const debtId = id("debt");
      await client.query("INSERT INTO debts (id,name,direction,principal_amount,due_date,status,description) VALUES ($1,$2,$3,$4,$5,'active',$6)", [debtId, item.name.trim(), item.direction, item.principalAmount, item.dueDate || null, item.description?.trim() || null]);
      ids.push(debtId);
    }
    return { ids, count: ids.length };
  });
}

export async function createBulkDebtPayments(items: { debtId: string; walletId: string; amount: number; date: string; note?: string }[]) {
  checkBatch(items, "pembayaran utang");
  return transaction(async (client) => {
    const ids: string[] = [];
    for (const item of items) {
      if (!item.debtId || !item.walletId || !item.date || !Number.isInteger(item.amount) || item.amount <= 0) throw new Error("Data pembayaran utang tidak valid.");
      const debt = (await client.query<{ name: string; direction: string; principal_amount: string }>("SELECT name,direction,principal_amount FROM debts WHERE id=$1 AND status='active' FOR UPDATE", [item.debtId])).rows[0];
      if (!debt) throw new Error("Utang tidak ditemukan atau sudah lunas.");
      const paid = Number((await client.query<{ total: string }>("SELECT COALESCE(SUM(amount),0) total FROM debt_payments WHERE debt_id=$1", [item.debtId])).rows[0].total);
      if (item.amount > Number(debt.principal_amount) - paid) throw new Error("Pembayaran melebihi sisa utang.");
      if (!(await client.query("SELECT 1 FROM wallets WHERE id=$1 FOR UPDATE", [item.walletId])).rowCount) throw new Error("Wallet pembayaran tidak ditemukan.");
      const transactionId = id("tx");
      await client.query("INSERT INTO transactions (id,type,wallet_id,amount,category,description,date,note) VALUES ($1,$2,$3,$4,'utang',$5,$6,$7)", [transactionId, debt.direction === "owed_by_me" ? "expense" : "income", item.walletId, item.amount, debt.name, item.date, item.note?.trim() || null]);
      await client.query("INSERT INTO debt_payments (id,debt_id,wallet_id,amount,date,note,transaction_id) VALUES ($1,$2,$3,$4,$5,$6,$7)", [id("payment"), item.debtId, item.walletId, item.amount, item.date, item.note?.trim() || null, transactionId]);
      if (item.amount === Number(debt.principal_amount) - paid) await client.query("UPDATE debts SET status='paid',updated_at=NOW() WHERE id=$1", [item.debtId]);
      ids.push(transactionId);
    }
    return { ids, count: ids.length };
  });
}

export async function createBulkAssets(items: Parameters<typeof import("./assets").createAsset>[0][]) {
  checkBatch(items, "aset");
  return transaction(async (client) => {
    const ids: string[] = [];
    for (const item of items) {
      if (!item.name?.trim() || !item.category || !item.assetType || typeof item.quantity !== "number" || item.quantity <= 0 || !Number.isInteger(item.purchaseValue) || item.purchaseValue < 0 || !Number.isInteger(item.currentValue) || item.currentValue < 0) throw new Error("Data aset tidak valid.");
      const assetId = id("asset");
      const ticker = item.assetType === "stock" ? item.name.trim().toUpperCase() : item.ticker?.trim().toUpperCase() || null;
      await client.query("INSERT INTO assets (id,name,category,asset_type,quantity,purchase_value,current_value,valuation_date,note,ticker) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", [assetId, item.name.trim(), item.category, item.assetType, item.quantity, item.purchaseValue, item.currentValue, item.valuationDate || new Date().toISOString().slice(0, 10), item.note?.trim() || null, ticker]);
      ids.push(assetId);
    }
    return { ids, count: ids.length };
  });
}

export async function createBulkUpcomingExpenses(items: Parameters<typeof import("./upcoming-expenses").createUpcomingExpense>[0][]) {
  checkBatch(items, "pengeluaran mendatang");
  return transaction(async (client) => {
    const ids: string[] = [];
    for (const item of items) {
      if (!item.name?.trim() || !Number.isInteger(item.amount) || item.amount <= 0 || !item.category || !item.dueDate || !["once", "weekly", "monthly", "yearly"].includes(item.recurrence)) throw new Error("Data pengeluaran mendatang tidak valid.");
      if (item.walletId && !(await client.query("SELECT 1 FROM wallets WHERE id=$1", [item.walletId])).rowCount) throw new Error("Wallet pengeluaran tidak ditemukan.");
      const expenseId = id("ue");
      await client.query("INSERT INTO upcoming_expenses (id,name,amount,wallet_id,category,due_date,recurrence,status,note) VALUES ($1,$2,$3,$4,$5,$6,$7,'scheduled',$8)", [expenseId, item.name.trim(), item.amount, item.walletId || null, item.category, item.dueDate, item.recurrence, item.note?.trim() || null]);
      ids.push(expenseId);
    }
    return { ids, count: ids.length };
  });
}

export async function createBulkWishlists(items: Parameters<typeof import("./wishlists").createWishlist>[0][]) {
  checkBatch(items, "wishlist");
  return transaction(async (client) => {
    const ids: string[] = [];
    for (const item of items) {
      if (!item.name?.trim() || !Number.isInteger(item.targetAmount) || item.targetAmount <= 0 || !Number.isInteger(item.savedAmount) || item.savedAmount < 0 || item.savedAmount > item.targetAmount || !["low", "medium", "high"].includes(item.priority)) throw new Error("Data wishlist tidak valid.");
      const wishlistId = id("wish");
      await client.query("INSERT INTO wishlists (id,name,target_amount,saved_amount,priority,target_date,note) VALUES ($1,$2,$3,$4,$5,$6,$7)", [wishlistId, item.name.trim(), item.targetAmount, item.savedAmount, item.priority, item.targetDate || null, item.note?.trim() || null]);
      ids.push(wishlistId);
    }
    return { ids, count: ids.length };
  });
}