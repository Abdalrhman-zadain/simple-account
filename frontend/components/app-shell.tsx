"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const isAuthPage = pathname === "/login" || pathname === "/register";

  return (
    <>
      <SiteHeader
        isCollapsed={isSidebarCollapsed}
        onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
      />
      <main
        className={cn(
          "min-h-screen transition-[padding] duration-300 ease-out",
          isAuthPage ? "pl-0" : isSidebarCollapsed ? "pl-20" : "pl-60",
        )}
      >
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </>
  );
}
