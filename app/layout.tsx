import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-geist",
  display: "swap",
});

export const metadata: Metadata = {
  title: "dompetku — Laporan Keuangan",
  description: "Ringkasan kondisi keuangan pribadi",
};

export const viewport: Viewport = {
  themeColor: "#16764e",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id" className={geist.variable}><body>{children}</body></html>;
}
