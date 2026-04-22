import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RequireAuth } from "@/components/require-auth";
import { PageSkeleton } from "@/components/ui";

const InventoryPage = dynamic(
  () => import("@/features/phase-5-inventory-management/inventory").then((mod) => mod.InventoryPage),
  {
    loading: () => <PageSkeleton />,
  },
);

export default function Page() {
  return (
    <RequireAuth>
      <Suspense>
        <InventoryPage />
      </Suspense>
    </RequireAuth>
  );
}
