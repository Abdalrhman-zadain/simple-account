import { AuthForm } from "@/components/auth-form";
import { PageShell } from "@/components/ui";

export default function LoginPage() {
  return (
    <PageShell>
      <AuthForm mode="login" />
    </PageShell>
  );
}
