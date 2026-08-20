"use client";

import { useEffect, useState } from "react";

export type ChartColors = {
  accent: string;
  red: string;
  blue: string;
  amber: string;
  violet: string;
  line: string;
  muted: string;
};

const FALLBACK: ChartColors = {
  accent: "#177a4b",
  red: "#c0382e",
  blue: "#1d4ed8",
  amber: "#9a6200",
  violet: "#6d28d9",
  line: "#dde3de",
  muted: "#5c6660",
};

function read(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function readAll(): ChartColors {
  return {
    accent: read("--accent") || FALLBACK.accent,
    red: read("--red") || FALLBACK.red,
    blue: read("--blue") || FALLBACK.blue,
    amber: read("--amber") || FALLBACK.amber,
    violet: read("--violet") || FALLBACK.violet,
    line: read("--line") || FALLBACK.line,
    muted: read("--muted") || FALLBACK.muted,
  };
}

// ponytail: MutationObserver on <html> data-theme/data-accent re-renders charts on theme change
export function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(FALLBACK);

  useEffect(() => {
    const apply = () => setColors(readAll());
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-accent"] });
    return () => observer.disconnect();
  }, []);

  return colors;
}
