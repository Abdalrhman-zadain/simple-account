import { Suspense } from "react";

import { CreateAccountForm } from "@/features/accounting/chart-of-accounts";
import { RequireAuth } from "@/components/require-auth";
import { PageShell } from "@/components/ui";

export default async function EditAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <PageShell>
      <RequireAuth>
        <Suspense fallback={null}>
          <CreateAccountForm accountId={id} />
        </Suspense>
      </RequireAuth>
    </PageShell>
  );
}
