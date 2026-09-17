import { getFinancialHealthData } from "@/lib/financial-health";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getFinancialHealthData();
    return NextResponse.json({ data });
  } catch (err) {
    console.error("Financial Health API error:", err);
    return NextResponse.json({ error: "Gagal memuat data kesehatan finansial" }, { status: 500 });
  }
}