import { NextResponse } from "next/server";
import { createBulkTransfers, createTransfer } from "@/lib/transactions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (Array.isArray(body.transfers)) {
      if (!body.transfers.every((item: unknown) => item && typeof item === "object" && !Array.isArray(item))) return NextResponse.json({ error: "Format transfers harus berupa array object." }, { status: 400 });
      const result = await createBulkTransfers(body.transfers);
      return NextResponse.json(result, { status: 201 });
    }
    if (!body.sourceWalletId || !body.destinationWalletId || !body.date || !Number.isInteger(body.amount) || body.amount <= 0) return NextResponse.json({ error: "Lengkapi wallet sumber, tujuan, tanggal, dan nominal positif." }, { status: 400 });
    const id = await createTransfer(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Transfer tidak dapat disimpan." }, { status: 400 });
  }
}
