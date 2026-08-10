import { getAnalytics } from "@/lib/dashboard";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period");

    if (!period || !["daily", "weekly", "monthly", "yearly"].includes(period)) {
      return NextResponse.json({ error: "Period wajib diisi (daily/weekly/monthly/yearly)" }, { status: 400 });
    }

    const data = await getAnalytics(period as any);
    return NextResponse.json({ data });
    
  } catch (err) {
    console.error("Analytics API error:", err);
    return NextResponse.json({ error: "Gagal memuat data analitik" }, { status: 500 });
  }
}
