import type { Metadata } from "next";
import { Inter, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { AppContextProvider } from "@/context/AppContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FinCorp Indonesia - Corporate Accounting",
  description: "Aplikasi pencatatan keuangan perusahaan yang dirancang khusus untuk memenuhi standar akuntansi Indonesia berdasarkan PSAK dan UU Perpajakan Indonesia.",
  keywords: ["accounting", "finance", "Indonesia", "PSAK", "tax", "faktur", "laporan keuangan"],
  authors: [{ name: "FinCorp Indonesia" }],
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} ${hankenGrotesk.variable} font-body-md antialiased h-full`}>
        <AppContextProvider>
          {children}
        </AppContextProvider>
      </body>
    </html>
  );
}