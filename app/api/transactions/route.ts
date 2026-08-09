import { NextResponse } from "next/server";
import { createTransaction, listTransactions } from "@/lib/transactions";
import { paginationMeta, parsePagination } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pagination = parsePagination(request);
  const result = await listTransactions({ type: url.searchParams.get("type") || undefined, walletId: url.searchParams.get("walletId") || undefined, category: url.searchParams.get("category") || undefined, from: url.searchParams.get("from") || undefined, to: url.searchParams.get("to") || undefined }, pagination);
  return NextResponse.json({ transactions: result.rows, pagination: paginationMeta(pagination, result.total) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!['income', 'expense'].includes(body.type) || !body.walletId || !body.category || !body.date || !Number.isInteger(body.amount) || body.amount <= 0) return NextResponse.json({ error: "Lengkapi tipe, wallet, kategori, tanggal, dan nominal positif." }, { status: 400 });
    const id = await createTransaction(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Transaksi tidak dapat disimpan." }, { status: 500 });
  }
}
