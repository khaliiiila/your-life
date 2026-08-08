import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    if (!body.name?.trim() || !["owed_by_me", "owed_to_me"].includes(body.direction) || !Number.isInteger(body.principalAmount) || body.principalAmount <= 0) {
      return NextResponse.json({ error: "Lengkapi nama, arah, dan nominal positif." }, { status: 400 });
    }
    const debt = db.prepare("SELECT * FROM debts WHERE id = ?").get(id);
    if (!debt) return NextResponse.json({ error: "Utang tidak ditemukan." }, { status: 404 });
    db.prepare("UPDATE debts SET name = ?, direction = ?, principal_amount = ?, due_date = ?, description = ?, updated_at = ? WHERE id = ?").run(
      body.name.trim(),
      body.direction,
      body.principalAmount,
      body.dueDate || null,
      body.description?.trim() || null,
      new Date().toISOString(),
      id
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Utang tidak dapat diperbarui." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const payments = db.prepare("SELECT COUNT(*) AS total FROM debt_payments WHERE debt_id = ?").get(id) as { total: number };
    if (payments.total > 0) return NextResponse.json({ error: "Hapus semua pembayaran terlebih dahulu." }, { status: 400 });
    const result = db.prepare("DELETE FROM debts WHERE id = ?").run(id);
    if (result.changes === 0) return NextResponse.json({ error: "Utang tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Utang tidak dapat dihapus." }, { status: 500 });
  }
}
