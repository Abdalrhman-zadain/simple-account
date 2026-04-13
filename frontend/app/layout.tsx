import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

import { AppShell } from "@/components/app-shell";
import { AppProviders } from "@/providers/app-providers";

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
    <html lang="en" className="antialiased bg-[#f5f5f5]">
      <body className="font-sans selection:bg-primary/30">
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
