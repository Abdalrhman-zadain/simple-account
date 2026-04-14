import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";

import { AppShell } from "@/components/app-shell";
import { AppProviders } from "@/providers/app-providers";

const inter = localFont({
  src: [
    { path: "./fonts/Inter-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Inter-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Inter-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/Inter-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/Inter-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Genius ERP — General Ledger",
  description: "Enterprise Resource Planning — Chart of Accounts, Journal Entries, and General Ledger.",
};

type AppLanguage = "en" | "ar";

function getLanguageInitScript(fallbackLanguage: AppLanguage) {
  return `
    (() => {
      try {
        const stored = window.localStorage.getItem("app_language");
        const nextLanguage =
          stored === "ar" || stored === "en"
            ? stored
            : (navigator.language || "").toLowerCase().startsWith("ar")
              ? "ar"
              : "${fallbackLanguage}";

        document.documentElement.lang = nextLanguage;
        document.documentElement.dir = nextLanguage === "ar" ? "rtl" : "ltr";
        document.cookie = "app_language=" + nextLanguage + "; path=/; max-age=31536000; samesite=lax";
      } catch {
        document.documentElement.lang = "${fallbackLanguage}";
        document.documentElement.dir = "${fallbackLanguage}" === "ar" ? "rtl" : "ltr";
      }
    })();
  `;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLanguage = cookieStore.get("app_language")?.value === "ar" ? "ar" : "en";

  return (
    <html
      lang={initialLanguage}
      dir={initialLanguage === "ar" ? "rtl" : "ltr"}
      suppressHydrationWarning
      className={`${inter.variable} antialiased bg-[#f5f5f5]`}
    >
      <body className="font-sans selection:bg-primary/30">
        <Script id="app-language-init" strategy="beforeInteractive">
          {getLanguageInitScript(initialLanguage)}
        </Script>
        <AppProviders initialLanguage={initialLanguage}>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
