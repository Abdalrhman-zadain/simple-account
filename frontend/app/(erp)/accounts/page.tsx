import { AccountsPage } from "@/features/accounting/chart-of-accounts";
import { RequireAuth } from "@/components/require-auth";
import { PageShell } from "@/components/ui";

export default function AccountsRoute() {
  return (
    <PageShell>
      <RequireAuth>
        <AccountsPage />
      </RequireAuth>
    </PageShell>
  );
}
