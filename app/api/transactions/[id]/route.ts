import { NextRequest, NextResponse } from "next/server";
import { db, nowIso } from "@/lib/db";
import { idr } from "@/lib/formatters";

// GET /api/transactions/:id - Get single transaction by ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  try {
    const stmt = db.prepare("SELECT * FROM transactions WHERE id = ?");
    const tx = stmt.get(id);
    
    if (!tx) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }
    
    return NextResponse.json({ transaction: tx });
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengambil transaksi" }, { status: 500 });
  }
}

// PATCH /api/transactions/:id - Update transaction
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  try {
    const body = await request.json();
    const { type, wallet_id, amount, category, description, date } = body;
    
    // Validate required fields
    if (!type || !wallet_id || !amount || !category || !date) {
      return NextResponse.json(
        { error: "Semua field wajib diisi" },
        { status: 400 }
      );
    }
    
    // Validate amount is integer
    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Nominal harus berupa angka bulat lebih dari nol" },
        { status: 400 }
      );
    }
    
    // Check wallet exists
    const walletExists = db.prepare("SELECT 1 FROM wallets WHERE id = ?").get(wallet_id);
    if (!walletExists) {
      return NextResponse.json(
        { error: "Wallet tidak ditemukan" },
        { status: 404 }
      );
    }
    
    // Update transaction
    const updateStmt = db.prepare(`
      UPDATE transactions 
      SET type = ?, wallet_id = ?, amount = ?, category = ?, description = ?, date = ?
      WHERE id = ?
    `);
    
    const info = updateStmt.run(type, wallet_id, amount, category, description ?? null, date, id);
    
    if (info.changes === 0) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }
    
    // Reload updated transaction with wallet info
    const updatedTx = db.prepare(`
      SELECT t.*, w.name as wallet_name 
      FROM transactions t 
      JOIN wallets w ON t.wallet_id = w.id 
      WHERE t.id = ?
    `).get(id);
    
    return NextResponse.json({ transaction: updatedTx });
  } catch (error) {
    console.error("Error updating transaction:", error);
    return NextResponse.json({ error: "Gagal memperbarui transaksi" }, { status: 500 });
  }
}

// DELETE /api/transactions/:id - Delete transaction
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  try {
    // Get transaction to check if it exists
    const tx = db.prepare("SELECT * FROM transactions WHERE id = ?").get(id);
    
    if (!tx) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }
    
    // Delete transaction
    const deleteStmt = db.prepare("DELETE FROM transactions WHERE id = ?");
    const info = deleteStmt.run(id);
    
    if (info.changes === 0) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }
    
    return NextResponse.json({ message: "Transaksi berhasil dihapus", deletedId: id });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json({ error: "Gagal menghapus transaksi" }, { status: 500 });
  }
}