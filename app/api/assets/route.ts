import { NextResponse } from "next/server";
import { createAsset, listAssets } from "@/lib/assets";
import { paginationMeta, parsePagination } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const pagination = parsePagination(request);
  const result = await listAssets(pagination);
  return NextResponse.json({ assets: result.rows, pagination: paginationMeta(pagination, result.total) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name?.trim() || !body.category || !body.assetType || typeof body.quantity !== "number" || body.quantity <= 0 || !Number.isInteger(body.purchaseValue) || body.purchaseValue < 0 || !Number.isInteger(body.currentValue) || body.currentValue < 0) return NextResponse.json({ error: "Lengkapi nama, jenis, jumlah, dan nilai aset yang valid." }, { status: 400 });
    return NextResponse.json({ id: await createAsset(body) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Aset tidak dapat disimpan." }, { status: 500 });
  }
}
