import { NextResponse } from "next/server";
import { createTransfer } from "@/lib/transactions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.sourceWalletId || !body.destinationWalletId || !body.date || !Number.isInteger(body.amount) || body.amount <= 0) return NextResponse.json({ error: "Lengkapi wallet sumber, tujuan, tanggal, dan nominal positif." }, { status: 400 });
    const id = await createTransfer(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Transfer tidak dapat disimpan." }, { status: 400 });
  }
}
