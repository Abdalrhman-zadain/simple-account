"use client";

import { ReactNode } from "react";

import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
import { SettingsProvider } from "@/providers/settings-provider";

export function AppProviders({
  children,
  initialLanguage,
}: {
  children: ReactNode;
  initialLanguage: "en" | "ar";
}) {
  return (
    <QueryProvider>
      <SettingsProvider initialLanguage={initialLanguage}>
        <AuthProvider>{children}</AuthProvider>
      </SettingsProvider>
    </QueryProvider>
  );
}
