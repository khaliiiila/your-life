import { NextResponse } from "next/server";
import { getLatestWhaleSnapshot } from "@/lib/whale";

export const dynamic = "force-dynamic";
const cache = new Map<string, { exp: number; data: unknown }>();

export async function GET() {
  const key = "whale:latest";
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return NextResponse.json(hit.data);
  try {
    const snapshot = await getLatestWhaleSnapshot();
    if (!snapshot) return NextResponse.json({ error: "Belum ada data whale." }, { status: 404 });
    const data = { snapshot };
    cache.set(key, { exp: Date.now() + 15 * 60_000, data });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal membaca data whale." }, { status: 500 });
  }
}
