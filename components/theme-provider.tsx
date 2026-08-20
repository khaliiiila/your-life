"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_THEME,
  STORAGE_KEY,
  parseTheme,
  resolveMode,
  systemPrefersDark,
  type ThemeMode,
  type ThemeSettings,
} from "@/lib/theme";

type ThemeContextValue = {
  settings: ThemeSettings;
  resolvedTheme: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: ThemeSettings["accent"]) => void;
  setDensity: (density: ThemeSettings["density"]) => void;
  setRadius: (radius: ThemeSettings["radius"]) => void;
  resetTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyToDom(settings: ThemeSettings) {
  const root = document.documentElement;
  root.dataset.accent = settings.accent;
  root.dataset.density = settings.density;
  root.dataset.radius = settings.radius;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_THEME;
    return parseTheme(localStorage.getItem(STORAGE_KEY));
  });
  const [systemDark, setSystemDark] = useState<boolean>(() =>
    typeof window === "undefined" ? false : systemPrefersDark()
  );
  const dirtyRef = useRef(false);

  // Load persisted theme from server (cross-device). Skips if user already changed locally.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json?.settings || dirtyRef.current) return;
        setSettings(parseTheme(typeof json.settings === "string" ? json.settings : JSON.stringify(json.settings)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const resolved = resolveMode(settings.mode, systemDark);
    const root = document.documentElement;
    root.dataset.theme = resolved;
    applyToDom(settings);
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = resolved === "dark" ? "#121614" : "#f4f7f5";
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* storage unavailable — theme stays in-session */
    }
    if (dirtyRef.current) {
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      }).catch(() => {});
    }
  }, [settings, systemDark]);

  const value = useMemo<ThemeContextValue>(() => {
    const change = (update: Partial<ThemeSettings>) => {
      dirtyRef.current = true;
      setSettings((s) => ({ ...s, ...update }));
    };
    return {
      settings,
      resolvedTheme: resolveMode(settings.mode, systemDark),
      setMode: (mode) => change({ mode }),
      setAccent: (accent) => change({ accent }),
      setDensity: (density) => change({ density }),
      setRadius: (radius) => change({ radius }),
      resetTheme: () => change(DEFAULT_THEME),
    };
  }, [settings, systemDark]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme harus dipakai di dalam <ThemeProvider>");
  return ctx;
}
