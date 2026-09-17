import { NextResponse } from "next/server";
import { getThemeSettings, saveThemeSettings, getFinancialHealthSettings, saveFinancialHealthSettings } from "@/lib/settings-db";
import { parseTheme } from "@/lib/theme";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [theme, financialHealth] = await Promise.all([
      getThemeSettings(),
      getFinancialHealthSettings(),
    ]);
    return NextResponse.json({ settings: theme, financialHealth });
  } catch {
    return NextResponse.json({ settings: null, financialHealth: null });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { settings?: unknown; financialHealth?: unknown } | null;
    
    if (body?.settings) {
      const raw = typeof body.settings === "string" ? body.settings : JSON.stringify(body.settings);
      const settings = parseTheme(raw);
      await saveThemeSettings(settings);
    }
    
    if (body?.financialHealth) {
      await saveFinancialHealthSettings(body.financialHealth as Record<string, unknown>);
    }
    
    const [theme, financialHealth] = await Promise.all([
      getThemeSettings(),
      getFinancialHealthSettings(),
    ]);
    
    return NextResponse.json({ ok: true, settings: theme, financialHealth });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
