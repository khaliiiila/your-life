import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const rows = (await query<{ value: string; date: string }>(
    "SELECT value, date FROM asset_valuations WHERE asset_id=$1 ORDER BY date DESC LIMIT 60",
    [id],
  )).rows.map((r) => ({ value: Number(r.value), date: r.date }));
  return NextResponse.json({ rows });
}
