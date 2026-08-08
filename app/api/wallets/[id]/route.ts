import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    if (!body.name?.trim() || !["cash", "bank", "ewallet", "credit"].includes(body.type) || !Number.isInteger(body.startingBalance)) {
      return NextResponse.json({ error: "Lengkapi nama, tipe, dan saldo awal yang valid." }, { status: 400 });
    }
    const result = db.prepare("UPDATE wallets SET name = ?, type = ?, starting_balance = ?, updated_at = ? WHERE id = ?").run(
      body.name.trim(),
      body.type,
      body.startingBalance,
      new Date().toISOString(),
      id
    );
    if (result.changes === 0) return NextResponse.json({ error: "Wallet tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Wallet tidak dapat diperbarui." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const existingTx = db.prepare("SELECT COUNT(*) AS total FROM transactions WHERE wallet_id = ?").get(id) as { total: number };
    if (existingTx.total > 0) return NextResponse.json({ error: "Hapus semua transaksi terlebih dahulu." }, { status: 400 });
    const result = db.prepare("DELETE FROM wallets WHERE id = ?").run(id);
    if (result.changes === 0) return NextResponse.json({ error: "Wallet tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Wallet tidak dapat dihapus." }, { status: 500 });
  }
}
