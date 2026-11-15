import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FinCorp — Pembukuan Perusahaan",
    template: "%s · FinCorp",
  },
  description: "Pembukuan double-entry, faktur, kas & bank, aset tetap, dan pajak untuk perusahaan Indonesia.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
