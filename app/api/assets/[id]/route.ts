import { NextResponse } from "next/server";
import { deleteAsset, updateAssetValue } from "@/lib/assets";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params; const body = await request.json();
    if (!Number.isInteger(body.currentValue) || body.currentValue < 0 || !body.valuationDate) return NextResponse.json({ error: "Nilai dan tanggal valuasi wajib diisi." }, { status: 400 });
    await updateAssetValue(id, body.currentValue, body.valuationDate); return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Nilai tidak dapat diperbarui." }, { status: 400 }); }
}

export async function DELETE(_request: Request, context: Context) {
  try { await deleteAsset((await context.params).id); return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Aset tidak dapat dihapus." }, { status: 400 }); }
}
