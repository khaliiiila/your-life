import { NextResponse } from "next/server";
import { fetchAnalysis } from "@/lib/bidbot";

export const dynamic = "force-dynamic";
const cache = new Map<string, { exp: number; data: unknown }>();

export async function GET(request: Request) {
  const ticker = new URL(request.url).searchParams.get("ticker")?.trim().toUpperCase();
  if (!ticker) return NextResponse.json({ error: "ticker wajib diisi." }, { status: 400 });
  const key = `analysis:${ticker}`;
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return NextResponse.json(hit.data);
  try {
    const data = await fetchAnalysis(ticker);
    cache.set(key, { exp: Date.now() + 60 * 60_000, data });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Analisis gagal." }, { status: 502 });
  }
}
