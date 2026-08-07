import { NextResponse } from "next/server";
import { deleteWishlist, updateWishlist } from "@/lib/wishlists";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    if (!Number.isInteger(body.savedAmount) || body.savedAmount < 0 || ![undefined, "active", "purchased", "cancelled"].includes(body.status)) return NextResponse.json({ error: "Jumlah terkumpul atau status tidak valid." }, { status: 400 });
    updateWishlist(id, body.savedAmount, body.status);
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Wishlist tidak dapat diperbarui." }, { status: 400 }); }
}

export async function DELETE(_request: Request, context: Context) {
  try { deleteWishlist((await context.params).id); return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Wishlist tidak dapat dihapus." }, { status: 400 }); }
}
