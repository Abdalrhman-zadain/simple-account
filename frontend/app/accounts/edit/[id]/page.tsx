import { CreateAccountForm } from "@/components/create-account-form";
import { RequireAuth } from "@/components/require-auth";
import { PageShell } from "@/components/ui";

export default async function EditAccountPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    return (
        <PageShell>
            <RequireAuth>
                <CreateAccountForm accountId={id} />
            </RequireAuth>
        </PageShell>
    );
}
