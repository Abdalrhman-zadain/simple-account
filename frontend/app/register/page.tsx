import { AuthForm } from "@/components/auth-form";
import { PageShell } from "@/components/ui";

export default function RegisterPage() {
  return (
    <PageShell>
      <AuthForm mode="register" />
    </PageShell>
  );
}
