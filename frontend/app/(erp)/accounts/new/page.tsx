import { Suspense } from "react";

import { CreateAccountForm } from "@/features/accounting/chart-of-accounts";
import { RequireAuth } from "@/components/require-auth";
import { PageShell } from "@/components/ui";

export default function NewAccountPage() {
  return (
    <PageShell>
      <RequireAuth>
        <Suspense fallback={null}>
          <CreateAccountForm />
        </Suspense>
      </RequireAuth>
    </PageShell>
  );
}
