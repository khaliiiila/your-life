import { NextResponse } from "next/server";
import { updateUpcomingExpense, deleteUpcomingExpense, payUpcomingExpense } from "@/lib/upcoming-expenses";

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

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    if (!body.name?.trim() || !Number.isInteger(body.amount) || body.amount <= 0 || !body.category || !body.dueDate || !["once", "weekly", "monthly", "yearly"].includes(body.recurrence)) {
      return NextResponse.json({ error: "Data lengkap dan valid diperlukan untuk memperbarui jadwal." }, { status: 400 });
    }
    updateUpcomingExpense(id, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Jadwal tidak dapat diperbarui." }, { status: 400 });
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
