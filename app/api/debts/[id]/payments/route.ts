import { NextResponse } from "next/server";
import { payDebt } from "@/lib/debts";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    if (!body.walletId || !body.date || !Number.isInteger(body.amount) || body.amount <= 0) return NextResponse.json({ error: "Lengkapi wallet, tanggal, dan nominal positif." }, { status: 400 });
    return NextResponse.json({ transactionId: payDebt(id, body.walletId, body.amount, body.date, body.note) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Pembayaran tidak dapat disimpan." }, { status: 400 });
  }
}
