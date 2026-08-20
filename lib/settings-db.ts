import { query } from "./db";
import { parseTheme, type ThemeSettings } from "./theme";

export async function getThemeSettings(): Promise<ThemeSettings | null> {
  const result = await query<{ theme: string }>("SELECT theme::text AS theme FROM app_settings WHERE id = 1");
  if (!result.rowCount) return null;
  return parseTheme(result.rows[0].theme);
}

export async function saveThemeSettings(settings: ThemeSettings): Promise<void> {
  await query("UPDATE app_settings SET theme = $1::jsonb, updated_at = NOW() WHERE id = 1", [JSON.stringify(settings)]);
}
