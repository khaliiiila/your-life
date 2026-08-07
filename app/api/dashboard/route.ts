import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard";

export function GET() {
  return NextResponse.json(getDashboardData());
}
