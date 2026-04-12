import { RequireAuth } from "@/components/require-auth";
import { FiscalPage } from "@/features/accounting/fiscal";

export default function Page() {
    return (
        <RequireAuth>
            <FiscalPage />
        </RequireAuth>
    );
}
