import { NextResponse } from "next/server";
import { fetchScanner } from "@/lib/bidbot";

export const dynamic = "force-dynamic";
const cache = new Map<string, { exp: number; data: unknown }>();

export async function GET(request: Request) {
  const kind = new URL(request.url).searchParams.get("kind") ?? "tops";
  if (!["tops", "topr", "topk"].includes(kind)) return NextResponse.json({ error: "kind harus tops/topr/topk" }, { status: 400 });
  const key = `scanner:${kind}`;
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return NextResponse.json(hit.data);
  try {
    const data = await fetchScanner(kind);
    cache.set(key, { exp: Date.now() + 15 * 60_000, data });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Scanner gagal." }, { status: 502 });
  }
}
