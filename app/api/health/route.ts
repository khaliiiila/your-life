import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export function GET() {
  const result = db.prepare("PRAGMA integrity_check").get() as { integrity_check: string };
  return NextResponse.json({ status: result.integrity_check === "ok" ? "ok" : "error" });
}
