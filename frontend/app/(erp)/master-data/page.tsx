import { RequireAuth } from "@/components/require-auth";
import { MasterDataPage } from "@/features/accounting/master-data";

export default function Page() {
    return (
        <RequireAuth>
            <MasterDataPage />
        </RequireAuth>
    );
}
