import { NextRequest, NextResponse } from "next/server";

const ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_DB",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "POSTGRES_HOST_PORT",
  "APP_PORT",
  "SQLITE_DATABASE_PATH",
  "DB_SYNC_SECRET",
  "AI_API_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "BIDBOT_EMAIL",
  "BIDBOT_PASSWORD",
  "PROD_APP_URL",
  "WHALE_INGEST_SECRET",
] as const;

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
    for (const key of ENV_KEYS) {
      const value = process.env[key];
      if (value !== undefined && value !== "") {
        // Escape newlines in value if any
        const safe = value.replace(/\n/g, "\\n");
        lines.push(`${key}=${safe}`);
      }
    }
    const body = lines.join("\n") + "\n";

    console.log(`[env-export] accessed at ${new Date().toISOString()} from ${request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown"}`);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename=".env"`,
        "Content-Length": Buffer.byteLength(body).toString(),
      },
    });
  } catch (error) {
    console.error("Env export error:", error);
    return NextResponse.json({ error: "Gagal membuat env export." }, { status: 500 });
  }
}
