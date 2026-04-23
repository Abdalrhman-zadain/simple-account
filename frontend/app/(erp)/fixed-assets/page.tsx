import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RequireAuth } from "@/components/require-auth";
import { PageSkeleton } from "@/components/ui";

const FixedAssetsPage = dynamic(
  () => import("@/features/phase-7-fixed-assets-management/fixed-assets").then((mod) => mod.FixedAssetsPage),
  { loading: () => <PageSkeleton /> },
);

export default function Page() {
  return (
    <RequireAuth>
      <Suspense>
        <FixedAssetsPage />
      </Suspense>
    </RequireAuth>
  );
}
