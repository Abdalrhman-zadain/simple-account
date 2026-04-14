"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { usePathname } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/utils";

const DevRoutePerf =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("@/components/route-perf").then((mod) => mod.RoutePerf), { ssr: false })
    : function NoopRoutePerf() {
        return null;
      };

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const isAuthPage = pathname === "/login" || pathname === "/register";

  return (
    <>
      <DevRoutePerf />
      <SiteHeader
        isCollapsed={isSidebarCollapsed}
        onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
      />
      <main
        className={cn(
          "min-h-screen",
          isAuthPage
            ? "pl-0 pr-0"
            : isSidebarCollapsed
              ? "ltr:pl-20 rtl:pr-20"
              : "ltr:pl-60 rtl:pr-60",
        )}
      >
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </>
  );
}
