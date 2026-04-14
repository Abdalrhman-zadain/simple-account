"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useIsFetching } from "@tanstack/react-query";

function now() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/**
 * Dev-only helper to understand what makes route switches feel slow.
 * Logs timing between pathname change and when React Query is idle again.
 */
export function RoutePerf() {
  const pathname = usePathname();
  const isFetching = useIsFetching();
  const lastPathRef = useRef<string | null>(null);
  const navStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    if (lastPathRef.current !== pathname) {
      const prev = lastPathRef.current;
      lastPathRef.current = pathname;
      navStartRef.current = now();
      // eslint-disable-next-line no-console
      console.log(`[route-perf] nav ${prev ?? "(first)"} -> ${pathname}`);
    }
  }, [pathname]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!navStartRef.current) return;

    // When React Query goes idle, capture "data settled" time.
    if (isFetching === 0) {
      const ms = Math.round(now() - navStartRef.current);
      navStartRef.current = null;
      // eslint-disable-next-line no-console
      console.log(`[route-perf] query-idle after ${ms}ms`);
    }
  }, [isFetching]);

  return null;
}

