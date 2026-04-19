import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RequireAuth } from "@/components/require-auth";
import { PageSkeleton } from "@/components/ui";

const SalesReceivablesPage = dynamic(
  () => import("@/features/phase-3-sales-receivables").then((mod) => mod.SalesReceivablesPage),
  {
    loading: () => <PageSkeleton />,
  },
);

export default function Page() {
  return (
    <RequireAuth>
      <Suspense>
        <SalesReceivablesPage />
      </Suspense>
    </RequireAuth>
  );
}
