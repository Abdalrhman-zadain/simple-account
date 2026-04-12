import { AuthForm } from "@/features/auth";
import { PageShell } from "@/components/ui";

export default function RegisterPage() {
  return (
    <PageShell>
      <AuthForm mode="register" />
    </PageShell>
  );
}
