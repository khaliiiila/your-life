import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paginationMeta, parsePagination } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const pagination = parsePagination(request);
  const total = (db.prepare("SELECT COUNT(*) AS total FROM wallets").get() as { total: number }).total;
  const wallets = db.prepare(`
    SELECT w.id, w.name, w.type, w.currency, w.starting_balance,
      w.starting_balance + COALESCE(SUM(CASE WHEN t.type IN ('income','adjustment') THEN t.amount ELSE -t.amount END), 0) AS balance
    FROM wallets w LEFT JOIN transactions t ON t.wallet_id = w.id GROUP BY w.id ORDER BY w.name LIMIT ? OFFSET ?
  `).all(pagination.pageSize, pagination.offset);
  return NextResponse.json({ wallets, pagination: paginationMeta(pagination, total) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name?.trim() || !["cash", "bank", "ewallet", "credit"].includes(body.type) || !Number.isInteger(body.startingBalance)) return NextResponse.json({ error: "Lengkapi nama, tipe, dan saldo awal yang valid." }, { status: 400 });
    const id = `wallet_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    db.prepare("INSERT INTO wallets (id, name, starting_balance, currency, type, created_at) VALUES (?, ?, ?, 'IDR', ?, ?)").run(id, body.name.trim(), body.startingBalance, body.type, new Date().toISOString());
    return NextResponse.json({ id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Wallet tidak dapat disimpan." }, { status: 500 });
  }
}
