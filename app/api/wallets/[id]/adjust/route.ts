import { NextResponse } from "next/server";
import { getAdjustmentAnalysis, recordAdjustment } from "@/lib/adjustments";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  const months = Math.min(24, Math.max(1, Number.parseInt(new URL(request.url).searchParams.get("months") || "6", 10) || 6));
  return NextResponse.json({ months, rows: await getAdjustmentAnalysis(id, months) });
}

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    if (!Number.isInteger(body.realBalance)) return NextResponse.json({ error: "Saldo real harus berupa angka bulat." }, { status: 400 });
    if (body.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(body.date))) return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });
    const result = await recordAdjustment({ walletId: id, realBalance: body.realBalance, date: body.date, note: body.note });
    return NextResponse.json({ ...result, difference: result.difference, balance: result.balance });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Penyesuaian tidak dapat disimpan." }, { status: 400 });
  }
}
