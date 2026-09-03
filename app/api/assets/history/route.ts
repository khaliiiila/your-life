import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { fetchSeries } from "@/lib/bidbot";

export const dynamic = "force-dynamic";
const cache = new Map<string, { exp: number; data: unknown }>();

export async function GET(request: Request) {
  const period = new URL(request.url).searchParams.get("period") ?? "3mo";
  if (!["1mo", "3mo", "6mo", "1y"].includes(period)) return NextResponse.json({ error: "period harus 1mo/3mo/6mo/1y" }, { status: 400 });
  const key = `history:${period}`;
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return NextResponse.json(hit.data);
  try {
    const rows = (await query<{ ticker: string | null; name: string; quantity: string; asset_type: string }>("SELECT ticker, name, quantity, asset_type FROM assets WHERE asset_type='stock'")).rows;
    const tickers = rows.map((r) => ({ t: (r.ticker?.trim() || r.name.trim().toUpperCase()), qty: Number(r.quantity) })).filter((x) => x.t);
    if (!tickers.length) return NextResponse.json({ series: [], tickers: [] });
    const allBars = await Promise.all(tickers.map(async ({ t, qty }) => ({ t, qty, bars: await fetchSeries(t, period) })));
    const byDate = new Map<string, number>();
    let covered = 0;
    for (const { qty, bars } of allBars) {
      if (!bars?.length) continue;
      covered++;
      for (const b of bars) {
        const d = b.time.slice(0, 10);
        byDate.set(d, (byDate.get(d) ?? 0) + Math.round(b.close * qty));
      }
    }
    const series = Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, value }));
    const data = { series, tickers: tickers.map((x) => x.t), covered };
    cache.set(key, { exp: Date.now() + 60 * 60_000, data });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "History gagal" }, { status: 502 });
  }
}
