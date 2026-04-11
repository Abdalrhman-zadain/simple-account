import { RequireAuth } from "@/components/require-auth";
import { GeneralLedgerPage } from "@/components/general-ledger-page";

export default function Page() {
    return (
        <RequireAuth>
            <GeneralLedgerPage />
        </RequireAuth>
    );
}
