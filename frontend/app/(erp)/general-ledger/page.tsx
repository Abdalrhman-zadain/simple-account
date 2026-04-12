import { RequireAuth } from "@/components/require-auth";
import { GeneralLedgerPage } from "@/features/accounting/general-ledger";

export default function Page() {
    return (
        <RequireAuth>
            <GeneralLedgerPage />
        </RequireAuth>
    );
}
