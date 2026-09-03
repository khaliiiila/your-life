import { NextResponse } from "next/server";
import { fetchSeries } from "@/lib/bidbot";

export const dynamic = "force-dynamic";
const cache = new Map<string, { exp: number; data: unknown }>();

export async function GET(request: Request) {
  const ticker = new URL(request.url).searchParams.get("ticker")?.trim().toUpperCase();
  const period = new URL(request.url).searchParams.get("period") ?? "3mo";
  if (!ticker) return NextResponse.json({ error: "ticker wajib diisi." }, { status: 400 });
  if (!["1mo", "3mo", "6mo", "1y"].includes(period)) return NextResponse.json({ error: "period tidak valid." }, { status: 400 });
  const key = `series:${ticker}:${period}`;
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return NextResponse.json(hit.data);
  try {
    const bars = await fetchSeries(ticker, period);
    const data = { ticker, period, bars };
    cache.set(key, { exp: Date.now() + 15 * 60_000, data });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Seri gagal dimuat." }, { status: 502 });
  }
}
