import { NextResponse } from "next/server";
import { createDebt, listDebts } from "@/lib/debts";
import { paginationMeta, parsePagination } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const pagination = parsePagination(request);
  const result = await listDebts(pagination);
  return NextResponse.json({ debts: result.rows, pagination: paginationMeta(pagination, result.total) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name?.trim() || !["owed_by_me", "owed_to_me"].includes(body.direction) || !Number.isInteger(body.principalAmount) || body.principalAmount <= 0) return NextResponse.json({ error: "Lengkapi nama, arah, dan nominal positif." }, { status: 400 });
    return NextResponse.json({ id: await createDebt(body) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Utang tidak dapat disimpan." }, { status: 500 });
  }
}
