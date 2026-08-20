import { NextResponse } from "next/server";
import { getThemeSettings, saveThemeSettings } from "@/lib/settings-db";
import { parseTheme } from "@/lib/theme";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getThemeSettings();
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ settings: null });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { settings?: unknown } | null;
    const raw = typeof body?.settings === "string" ? body.settings : JSON.stringify(body?.settings ?? null);
    const settings = parseTheme(raw);
    await saveThemeSettings(settings);
    return NextResponse.json({ ok: true, settings });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
