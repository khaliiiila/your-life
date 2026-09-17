import { query } from "./db";
import { parseTheme, type ThemeSettings } from "./theme";

export type FinancialHealthSettings = {
  emergencyFundMonths: number;
  dtiThresholdPercent: number;
};

const DEFAULT_FINANCIAL_HEALTH_SETTINGS: FinancialHealthSettings = {
  emergencyFundMonths: 6,
  dtiThresholdPercent: 36,
};

export async function getThemeSettings(): Promise<ThemeSettings | null> {
  const result = await query<{ theme: string }>("SELECT theme::text AS theme FROM app_settings WHERE id = 1");
  if (!result.rowCount) return null;
  return parseTheme(result.rows[0].theme);
}

export async function saveThemeSettings(settings: ThemeSettings): Promise<void> {
  await query("UPDATE app_settings SET theme = $1::jsonb, updated_at = NOW() WHERE id = 1", [JSON.stringify(settings)]);
}

export async function getFinancialHealthSettings(): Promise<FinancialHealthSettings> {
  const result = await query<{ settings: any }>("SELECT settings FROM app_settings WHERE id = 1");
  if (!result.rowCount) return DEFAULT_FINANCIAL_HEALTH_SETTINGS;
  const settings = result.rows[0].settings?.financialHealth;
  if (!settings) return DEFAULT_FINANCIAL_HEALTH_SETTINGS;
  return {
    emergencyFundMonths: settings.emergencyFundMonths ?? DEFAULT_FINANCIAL_HEALTH_SETTINGS.emergencyFundMonths,
    dtiThresholdPercent: settings.dtiThresholdPercent ?? DEFAULT_FINANCIAL_HEALTH_SETTINGS.dtiThresholdPercent,
  };
}

export async function saveFinancialHealthSettings(settings: Partial<FinancialHealthSettings>): Promise<void> {
  const current = await getFinancialHealthSettings();
  const merged = { ...current, ...settings };
  await query(
    "UPDATE app_settings SET settings = jsonb_set(COALESCE(settings, '{}'), '{financialHealth}', $1::jsonb), updated_at = NOW() WHERE id = 1",
    [JSON.stringify(merged)]
  );
}
