import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RequireAuth } from "@/components/require-auth";
import { PageSkeleton } from "@/components/ui";

const ReportingPage = dynamic(
  () => import("@/features/phase-8-reporting-control/reporting").then((mod) => mod.ReportingPage),
  { loading: () => <PageSkeleton /> },
);

export default function Page() {
  return (
    <RequireAuth>
      <Suspense>
        <ReportingPage />
      </Suspense>
    </RequireAuth>
  );
}
