import { AuthForm } from "@/features/auth";
import { PageShell } from "@/components/ui";

export default function LoginPage() {
  return (
    <PageShell>
      <AuthForm mode="login" />
    </PageShell>
  );
}
