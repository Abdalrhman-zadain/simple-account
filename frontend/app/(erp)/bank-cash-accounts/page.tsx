import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RequireAuth } from "@/components/require-auth";
import { PageSkeleton } from "@/components/ui";

const BankCashAccountsPage = dynamic(
  () => import("@/features/phase-2-bank-cash-management/bank-cash-accounts").then((mod) => mod.BankCashAccountsPage),
  {
    loading: () => <PageSkeleton />,
  },
);

export default function Page() {
  return (
    <RequireAuth>
      <Suspense>
        <BankCashAccountsPage />
      </Suspense>
    </RequireAuth>
  );
}
