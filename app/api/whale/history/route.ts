import { NextResponse } from "next/server";
import { getWhaleStockHistory } from "@/lib/whale";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code")?.trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "code wajib diisi." }, { status: 400 });
  return NextResponse.json({ code, rows: await getWhaleStockHistory(code) });
}
