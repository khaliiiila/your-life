import { numbers, query, transaction } from "./db";
import type { Pagination } from "./pagination";

export type TransactionInput = { type: "expense" | "income"; walletId: string; amount: number; category: string; description?: string; date: string; note?: string };
export type TransferInput = { sourceWalletId: string; destinationWalletId: string; amount: number; fee?: number; date: string; description?: string };
export type BulkTransferInput = {
  sourceWalletId?: string;
  sourceWalletName?: string;
  destinationWalletId?: string;
  destinationWalletName?: string;
  amount?: number | "all";
  allBalance?: boolean;
  fee?: number;
  date: string;
  description?: string;
  createDestination?: { name: string; type?: "cash" | "bank" | "ewallet" | "credit"; startingBalance?: number };
};

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
  const rows = (await query(`SELECT t.id,t.type,t.wallet_id,w.name AS wallet_name,t.amount,t.category,t.description,t.date::text,t.note FROM transactions t JOIN wallets w ON w.id=t.wallet_id WHERE ${where} ORDER BY t.date DESC,t.created_at DESC${suffix}`, params)).rows.map((row) => numbers(row, ["amount"]));
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

export async function createBulkTransfers(inputs: BulkTransferInput[]) {
  if (!inputs.length) throw new Error("Minimal satu transfer diperlukan.");
  if (inputs.length > 100) throw new Error("Maksimal 100 transfer per request.");

  return transaction(async (client) => {
    const names = inputs.flatMap((input) => [input.sourceWalletName, input.destinationWalletName]).filter((name): name is string => Boolean(name?.trim()));
    const existing = names.length
      ? (await client.query<{ id: string; name: string; type: string; starting_balance: string }>("SELECT id,name,type,starting_balance FROM wallets WHERE LOWER(name)=ANY($1::text[]) FOR UPDATE", [names.map((name) => name.trim().toLowerCase())])).rows
      : [];
    const wallets = new Map(existing.map((wallet) => [wallet.name.trim().toLowerCase(), wallet]));

    for (const input of inputs) {
      if (input.createDestination) {
        const name = input.createDestination.name.trim();
        if (!name) throw new Error("Nama wallet baru wajib diisi.");
        const key = name.toLowerCase();
        if (wallets.has(key)) throw new Error(`Wallet tujuan "${name}" sudah ada.`);
        const id = `wallet_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const wallet = (await client.query<{ id: string; name: string; type: string; starting_balance: string }>(
          "INSERT INTO wallets (id,name,type,starting_balance,currency) VALUES ($1,$2,$3,$4,'IDR') RETURNING id,name,type,starting_balance",
          [id, name, input.createDestination.type ?? "cash", input.createDestination.startingBalance ?? 0],
        )).rows[0];
        wallets.set(key, wallet);
        input.destinationWalletId = id;
      }
    }

    const resolve = (id: string | undefined, name: string | undefined, label: string) => {
      if (id) return existing.find((wallet) => wallet.id === id) ?? [...wallets.values()].find((wallet) => wallet.id === id);
      if (name) return wallets.get(name.trim().toLowerCase());
      throw new Error(`${label} wajib diisi.`);
    };
    const resolved = inputs.map((input) => ({ input, source: resolve(input.sourceWalletId, input.sourceWalletName, "Wallet sumber"), destination: resolve(input.destinationWalletId, input.destinationWalletName, "Wallet tujuan") }));
    if (resolved.some(({ source, destination }) => !source || !destination)) throw new Error("Ada wallet yang tidak ditemukan.");
    if (resolved.some(({ source, destination }) => source!.id === destination!.id)) throw new Error("Wallet sumber dan tujuan harus berbeda.");

    const balanceIds = [...new Set(resolved.filter(({ input }) => input.allBalance || input.amount === "all").map(({ source }) => source!.id))];
    const balances = new Map<string, number>();
    if (balanceIds.length) {
      await client.query("SELECT id FROM wallets WHERE id=ANY($1::text[]) FOR UPDATE", [balanceIds]);
      const rows = (await client.query<{ id: string; balance: string }>(
        "SELECT w.id,w.starting_balance+COALESCE(SUM(CASE WHEN t.type IN ('income','adjustment') THEN t.amount ELSE -t.amount END),0) balance FROM wallets w LEFT JOIN transactions t ON t.wallet_id=w.id WHERE w.id=ANY($1::text[]) GROUP BY w.id",
        [balanceIds],
      )).rows;
      rows.forEach((row) => balances.set(row.id, Number(row.balance)));
    }

    const transfers: { id: string; source: string; destination: string; amount: number; fee: number; date: string; description: string | null }[] = [];
    for (const { input, source, destination } of resolved) {
      const amountValue: number = input.allBalance || input.amount === "all" ? balances.get(source!.id) ?? 0 : input.amount ?? 0;
      if (!Number.isInteger(amountValue) || amountValue <= 0) throw new Error(`Nominal transfer dari \"${source!.name}\" tidak valid.`);
      const amount = amountValue;
      const fee = input.fee ?? 0;
      if (!Number.isInteger(fee) || fee < 0) throw new Error("Fee transfer tidak valid.");
      transfers.push({ id: `tr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, source: source!.id, destination: destination!.id, amount, fee, date: input.date, description: input.description?.trim() || null });
      if (balances.has(source!.id)) balances.set(source!.id, (balances.get(source!.id) ?? 0) - amount - fee);
    }

    const transferValues: unknown[] = [];
    const transferPlaceholders = transfers.map((item) => {
      const offset = transferValues.length;
      transferValues.push(item.id, item.source, item.destination, item.amount, item.fee, item.date, item.description);
      return `($${offset + 1},$${offset + 2},$${offset + 3},$${offset + 4},$${offset + 5},$${offset + 6},$${offset + 7})`;
    });
    await client.query(`INSERT INTO transfers (id,source_wallet_id,destination_wallet_id,amount,fee,date,description) VALUES ${transferPlaceholders.join(",")}`, transferValues);

    const transactionValues: unknown[] = [];
    const transactionPlaceholders = transfers.flatMap((item) => {
      const outId = `${item.id}_out`, inId = `${item.id}_in`, offset = transactionValues.length;
      transactionValues.push(outId, item.source, item.amount + item.fee, item.description || "Transfer keluar", item.date, item.id, inId, item.destination, item.amount, item.description || "Transfer masuk");
      return [`($${offset + 1},'expense',$${offset + 2},$${offset + 3},'transfer',$${offset + 4},$${offset + 5},$${offset + 6})`, `($${offset + 7},'income',$${offset + 8},$${offset + 9},'transfer',$${offset + 4},$${offset + 5},$${offset + 6})`];
    });
    await client.query(`INSERT INTO transactions (id,type,wallet_id,amount,category,description,date,note) VALUES ${transactionPlaceholders.join(",")}`, transactionValues);
    return { ids: transfers.map(({ id }) => id), count: transfers.length };
  });
}
