import { Suspense } from "react";
import { AccountsPage } from "@/features/accounting/chart-of-accounts";
import { RequireAuth } from "@/components/require-auth";
import { PageShell } from "@/components/ui";

export default function AccountsRoute() {
  return (
    <PageShell>
      <RequireAuth>
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
          </div>
        }>
          <AccountsPage />
        </Suspense>
      </RequireAuth>
    </PageShell>
  );
}
