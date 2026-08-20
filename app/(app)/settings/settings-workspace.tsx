"use client";

import { useSyncExternalStore } from "react";
import { Check, Monitor, Moon, RotateCcw, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import {
  ACCENT_OPTIONS,
  DENSITY_OPTIONS,
  MODE_OPTIONS,
  RADIUS_OPTIONS,
  type Accent,
  type Density,
  type RadiusPreset,
  type ThemeMode,
} from "@/lib/theme";

const MODE_ICONS = { light: Sun, dark: Moon, system: Monitor } as const;

export function SettingsPage() {
  const { settings, setMode, setAccent, setDensity, setRadius, resetTheme } = useTheme();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  if (!mounted) {
    return (
      <>
        <div className="page-heading">
          <div>
            <p className="eyebrow">PENGATURAN</p>
            <h1>Tampilan</h1>
          </div>
        </div>
        <div className="loading-state"><p>Memuat pengaturan...</p></div>
      </>
    );
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PENGATURAN</p>
          <h1>Tampilan</h1>
          <p className="muted">Sesuaikan tema dan gaya antarmuka sesuai seleramu.</p>
        </div>
      </div>

      <div className="settings-layout">
        <div className="settings-stack">
          <section className="card settings-section">
            <div className="card-label"><span>Mode tampilan</span></div>
            <div className="option-grid" role="radiogroup" aria-label="Mode tampilan">
              {MODE_OPTIONS.map(({ value, label }) => {
                const Icon = MODE_ICONS[value];
                const selected = settings.mode === value;
                return (
                  <label className={`option-card ${selected ? "selected" : ""}`} key={value}>
                    <input type="radio" name="mode" value={value} checked={selected} onChange={() => setMode(value as ThemeMode)} />
                    <Icon size={22} />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="card settings-section">
            <div className="card-label"><span>Warna aksen</span></div>
            <div className="swatch-row" role="radiogroup" aria-label="Warna aksen">
              {ACCENT_OPTIONS.map(({ value, label, hex }) => {
                const selected = settings.accent === value;
                return (
                  <label className={`swatch ${selected ? "selected" : ""}`} key={value} style={{ background: hex }} title={label}>
                    <input type="radio" name="accent" value={value} checked={selected} onChange={() => setAccent(value as Accent)} className="visually-hidden" />
                    {selected && <Check size={18} className="check" aria-hidden="true" />}
                    <span className="sr-only">{label}</span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="card settings-section">
            <div className="card-label"><span>Kepadatan</span></div>
            <div className="option-grid" role="radiogroup" aria-label="Kepadatan">
              {DENSITY_OPTIONS.map(({ value, label, hint }) => {
                const selected = settings.density === value;
                return (
                  <label className={`option-card ${selected ? "selected" : ""}`} key={value}>
                    <input type="radio" name="density" value={value} checked={selected} onChange={() => setDensity(value as Density)} />
                    <span>{label}</span>
                    <small className="muted">{hint}</small>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="card settings-section">
            <div className="card-label"><span>Bentuk sudut</span></div>
            <div className="option-grid" role="radiogroup" aria-label="Bentuk sudut">
              {RADIUS_OPTIONS.map(({ value, label, hint }) => {
                const selected = settings.radius === value;
                return (
                  <label className={`option-card ${selected ? "selected" : ""}`} key={value}>
                    <input type="radio" name="radius" value={value} checked={selected} onChange={() => setRadius(value as RadiusPreset)} />
                    <span className="radius-glyph" style={{ borderRadius: value === "sharp" ? 0 : value === "soft" ? 8 : 14, width: 26, height: 26, border: "3px solid currentColor" }} aria-hidden="true" />
                    <span>{label}</span>
                    <small className="muted">{hint}</small>
                  </label>
                );
              })}
            </div>
          </section>

          <button className="button subtle settings-reset" onClick={resetTheme}>
            <RotateCcw size={16} />Kembalikan ke bawaan
          </button>
        </div>

        <section className="card settings-section preview-surface" aria-label="Pratinjau tema">
          <div className="card-label"><span>Pratinjau</span></div>
          <div className="card" style={{ padding: 18 }}>
            <div className="card-label"><span>Saldo bulan ini</span><span className="date-chip">Agustus 2026</span></div>
            <strong className="hero-number" style={{ fontSize: 26 }}>Rp 12.480.000</strong>
            <div className="daily-compare" style={{ marginBottom: 12 }}>
              <div><span className={`trend positive`}>▲ 12%</span><small className="muted">vs bulan lalu</small></div>
              <div><span className={`trend negative`}>▼ 4%</span><small className="muted">vs rata-rata</small></div>
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="preview-input">Label contoh</label>
              <input id="preview-input" type="text" defaultValue="Teks input" readOnly />
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="button primary" type="button">Tombol utama</button>
              <button className="button subtle" type="button">Tombol sekunder</button>
            </div>
          </div>
          <div className="wallet-card" style={{ marginTop: 14 }}>
            <span className="wallet-icon"><Check size={18} /></span>
            <div>
              <h2>Wallet contoh</h2>
              <small>Bank · idr</small>
              <strong style={{ fontSize: 16 }}>Rp 2.450.000</strong>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
