import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RequireAuth } from "@/components/require-auth";
import { PageSkeleton } from "@/components/ui";

const PurchasesPage = dynamic(
  () => import("@/features/phase-4-procure-to-pay/purchases").then((mod) => mod.PurchasesPage),
  {
    loading: () => <PageSkeleton />,
  },
);

export default function Page() {
  return (
    <RequireAuth>
      <Suspense>
        <PurchasesPage />
      </Suspense>
    </RequireAuth>
  );
}
