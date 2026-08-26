import { NextResponse } from "next/server";
import { syncAssetPrices } from "@/lib/assets";
import { fetchPrice } from "@/lib/bidbot";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const results = await syncAssetPrices(fetchPrice);
    const ok = results.filter((r) => r.ok).length;
    return NextResponse.json({ ok, total: results.length, results });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Sync gagal." }, { status: 500 });
  }
}
