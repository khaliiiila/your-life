import { NextRequest, NextResponse } from "next/server";
import { ingestWhale } from "@/lib/whale";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = process.env.WHALE_INGEST_SECRET;
  if (!secret || secret.trim() === "") return NextResponse.json({ error: "WHALE_INGEST_SECRET belum dikonfigurasi di server." }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const result = await ingestWhale(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Ingest gagal." }, { status: 400 });
  }
}
