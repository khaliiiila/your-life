import { NextResponse } from "next/server";
import { deleteUpcomingExpense, payUpcomingExpense } from "@/lib/upcoming-expenses";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const transactionId = payUpcomingExpense(id, body.walletId);
    return NextResponse.json({ transactionId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Pengeluaran tidak dapat dibayar." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    deleteUpcomingExpense(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Pengeluaran tidak dapat dihapus." }, { status: 400 });
  }
}
