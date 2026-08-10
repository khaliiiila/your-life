import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const TABLES = ["wallets", "debts", "assets", "upcoming_expenses", "transfers", "transactions", "wishlists", "debt_payments"];

function escapeLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

export async function GET(request: NextRequest) {
  const syncSecret = process.env.DB_SYNC_SECRET;
  if (!syncSecret || syncSecret.trim() === "") {
    return NextResponse.json({ error: "DB_SYNC_SECRET belum dikonfigurasi di server." }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  const expectedAuth = `Bearer ${syncSecret}`;
  if (!authHeader || authHeader !== expectedAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const lines: string[] = [];
    lines.push("BEGIN;");
    lines.push(`TRUNCATE ${TABLES.join(", ")} CASCADE;`);

    for (const table of TABLES) {
      const columnResult = await db.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position`,
        [table]
      );
      const columns = columnResult.rows.map((r) => r.column_name);
      const quoted = columns.map((c) => `"${c}"`).join(", ");
      const selectColumns = columns.map((c) => `${c}::text AS "${c}"`).join(", ");
      const rows = await db.query(`SELECT ${selectColumns} FROM "${table}"`);
      for (const row of rows.rows) {
        const values = columns.map((c) => {
          const v = (row as Record<string, string | null>)[c];
          return v === null || v === undefined ? "NULL" : escapeLiteral(String(v));
        });
        lines.push(`INSERT INTO "${table}" (${quoted}) VALUES (${values.join(", ")});`);
      }
    }

    lines.push("COMMIT;");
    const sql = lines.join("\n");

    return new NextResponse(sql, {
      status: 200,
      headers: {
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename="keuangan_prod.sql"`,
        "Content-Length": Buffer.byteLength(sql).toString(),
      },
    });
  } catch (error) {
    console.error("DB export error:", error);
    return NextResponse.json({ error: "Gagal membuat dump database." }, { status: 500 });
  }
}
