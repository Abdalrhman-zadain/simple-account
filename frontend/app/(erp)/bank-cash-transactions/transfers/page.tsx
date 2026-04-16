import dynamic from "next/dynamic";
import { Suspense } from "react";

import { RequireAuth } from "@/components/require-auth";
import { PageSkeleton } from "@/components/ui";

const BankCashTransactionsPage = dynamic(
  () => import("@/features/phase-2-bank-cash-management/bank-cash-transactions").then((mod) => mod.BankCashTransactionsPage),
  {
    loading: () => <PageSkeleton />,
  },
);

export default function Page() {
  return (
    <RequireAuth>
      <Suspense>
        <BankCashTransactionsPage kind="TRANSFER" />
      </Suspense>
    </RequireAuth>
  );
}
