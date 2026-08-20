"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { resolvedTheme, setMode } = useTheme();
  const dark = resolvedTheme === "dark";

  return (
    <button
      className="icon-button"
      aria-label={dark ? "Aktifkan tema terang" : "Aktifkan tema gelap"}
      onClick={() => setMode(dark ? "light" : "dark")}
    >
      {dark ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
