import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";

import { SiteHeader } from "@/components/site-header";
import { AppProviders } from "@/providers/app-providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Genius ERP — General Ledger",
  description: "Enterprise Resource Planning — Chart of Accounts, Journal Entries, and General Ledger.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} antialiased dark`}>
      <body className="font-sans selection:bg-primary/30">
        <AppProviders>
          <SiteHeader />
          <main className="min-h-screen pl-60">
            <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
          </main>
        </AppProviders>
      </body>
    </html>
  );
}
