export type ThemeMode = "light" | "dark" | "system";
export type Accent = "green" | "blue" | "violet" | "rose" | "teal";
export type Density = "comfortable" | "compact";
export type RadiusPreset = "sharp" | "soft" | "rounded";

export const STORAGE_KEY = "dompetku-theme";

export type ThemeSettings = {
  mode: ThemeMode;
  accent: Accent;
  density: Density;
  radius: RadiusPreset;
};

export const DEFAULT_THEME: ThemeSettings = {
  mode: "system",
  accent: "green",
  density: "comfortable",
  radius: "soft",
};

export const MODE_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Terang" },
  { value: "dark", label: "Gelap" },
  { value: "system", label: "Sistem" },
];

export const ACCENT_OPTIONS: { value: Accent; label: string; hex: string }[] = [
  { value: "green", label: "Hijau", hex: "#177a4b" },
  { value: "blue", label: "Biru", hex: "#1d4ed8" },
  { value: "violet", label: "Violet", hex: "#6d28d9" },
  { value: "rose", label: "Merah mawar", hex: "#c0265d" },
  { value: "teal", label: "Teal", hex: "#0f766e" },
];

export const DENSITY_OPTIONS: { value: Density; label: string; hint: string }[] = [
  { value: "comfortable", label: "Nyaman", hint: "Lega & bernapas" },
  { value: "compact", label: "Padat", hint: "Rapat & hemat ruang" },
];

export const RADIUS_OPTIONS: { value: RadiusPreset; label: string; hint: string }[] = [
  { value: "sharp", label: "Tajam", hint: "Sudut tegas" },
  { value: "soft", label: "Halus", hint: "Sedikit membulat" },
  { value: "rounded", label: "Bulat", hint: "Lembut & ramah" },
];

const MODES = new Set<ThemeMode>(["light", "dark", "system"]);
const ACCENTS = new Set<Accent>(["green", "blue", "violet", "rose", "teal"]);
const DENSITIES = new Set<Density>(["comfortable", "compact"]);
const RADII = new Set<RadiusPreset>(["sharp", "soft", "rounded"]);

export function parseTheme(raw: string | null): ThemeSettings {
  if (!raw) return DEFAULT_THEME;
  try {
    const value = JSON.parse(raw) as Partial<ThemeSettings>;
    return {
      mode: value.mode && MODES.has(value.mode) ? value.mode : DEFAULT_THEME.mode,
      accent: value.accent && ACCENTS.has(value.accent) ? value.accent : DEFAULT_THEME.accent,
      density: value.density && DENSITIES.has(value.density) ? value.density : DEFAULT_THEME.density,
      radius: value.radius && RADII.has(value.radius) ? value.radius : DEFAULT_THEME.radius,
    };
  } catch {
    return DEFAULT_THEME;
  }
}

export function resolveMode(mode: ThemeMode, systemDark: boolean): "light" | "dark" {
  if (mode === "system") return systemDark ? "dark" : "light";
  return mode;
}

export function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
