import { RequireAuth } from "@/components/require-auth";
import { AuditPage } from "@/features/accounting/audit";

export default function Page() {
    return (
        <RequireAuth>
            <AuditPage />
        </RequireAuth>
    );
}
