import { NextResponse } from "next/server";
import { createWishlist, listWishlists } from "@/lib/wishlists";
import { paginationMeta, parsePagination } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const pagination = parsePagination(request);
  const result = listWishlists(pagination);
  return NextResponse.json({ wishlists: result.rows, pagination: paginationMeta(pagination, result.total) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name?.trim() || !Number.isInteger(body.targetAmount) || body.targetAmount <= 0 || !Number.isInteger(body.savedAmount) || body.savedAmount < 0 || body.savedAmount > body.targetAmount || !["low", "medium", "high"].includes(body.priority)) {
      return NextResponse.json({ error: "Lengkapi nama, target, tabungan awal, dan prioritas yang valid." }, { status: 400 });
    }
    return NextResponse.json({ id: createWishlist(body) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Wishlist tidak dapat disimpan." }, { status: 500 });
  }
}
