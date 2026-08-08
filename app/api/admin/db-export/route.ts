import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export async function GET(request: NextRequest) {
  const syncSecret = process.env.DB_SYNC_SECRET;
  
  if (!syncSecret || syncSecret.trim() === "") {
    return NextResponse.json(
      { error: "DB_SYNC_SECRET not configured on server" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const expectedAuth = `Bearer ${syncSecret}`;

  if (!authHeader || authHeader !== expectedAuth) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `export_keuangan_${Date.now()}.db`);

  try {
    // Perform WAL-safe SQLite backup
    await db.backup(tempFilePath);

    const fileBuffer = fs.readFileSync(tempFilePath);
    
    // Clean up temporary file
    fs.unlinkSync(tempFilePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/x-sqlite3",
        "Content-Disposition": `attachment; filename="keuangan_prod.db"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    if (fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch {
        // Ignore cleanup failure
      }
    }

    console.error("Failed to export database:", error);
    return NextResponse.json(
      { error: "Failed to export database" },
      { status: 500 }
    );
  }
}
