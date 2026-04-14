import dynamic from "next/dynamic";
import { Suspense } from "react";
import { RequireAuth } from "@/components/require-auth";
import { PageShell, PageSkeleton } from "@/components/ui";

const AccountsPage = dynamic(
  () => import("@/features/accounting/chart-of-accounts").then((mod) => mod.AccountsPage),
  {
    loading: () => <PageSkeleton />,
  }
);

export default function AccountsRoute() {
  return (
    <PageShell>
      <RequireAuth>
        <Suspense>
          <AccountsPage />
        </Suspense>
      </RequireAuth>
    </PageShell>
  );
}
