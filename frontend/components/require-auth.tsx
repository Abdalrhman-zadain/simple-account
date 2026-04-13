"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

import { useAuth } from "@/providers/auth-provider";
import { Card } from "@/components/ui";

export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuth();

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isHydrated, router]);

  if (!isHydrated) {
    return (
      <Card>
        <p className="text-sm text-slate-600">Restoring session…</p>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <p className="text-sm text-slate-700">This section is gated in the frontend for signed-in users.</p>
        <Link href="/login" className="mt-4 inline-flex rounded-full bg-ink px-4 py-2 text-sm text-gray-900">
          Go to login
        </Link>
      </Card>
    );
  }

  return <>{children}</>;
}
