import { CreateAccountForm } from "@/components/create-account-form";
import { RequireAuth } from "@/components/require-auth";
import { PageShell } from "@/components/ui";

export default function NewAccountPage() {
  return (
    <PageShell>
      <RequireAuth>
        <CreateAccountForm />
      </RequireAuth>
    </PageShell>
  );
}
