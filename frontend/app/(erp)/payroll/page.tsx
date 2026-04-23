import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RequireAuth } from "@/components/require-auth";
import { PageSkeleton } from "@/components/ui";

const PayrollPage = dynamic(
  () => import("@/features/phase-6-payroll-management/payroll").then((mod) => mod.PayrollPage),
  { loading: () => <PageSkeleton /> },
);

export default function Page() {
  return (
    <RequireAuth>
      <Suspense>
        <PayrollPage />
      </Suspense>
    </RequireAuth>
  );
}
