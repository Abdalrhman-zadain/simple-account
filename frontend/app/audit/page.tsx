import { RequireAuth } from "@/components/require-auth";
import { AuditPage } from "@/components/audit-page";

export default function Page() {
    return (
        <RequireAuth>
            <AuditPage />
        </RequireAuth>
    );
}
