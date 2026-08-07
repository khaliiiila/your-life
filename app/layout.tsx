import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Laporan Keuangan",
  description: "Ringkasan kondisi keuangan pribadi",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
