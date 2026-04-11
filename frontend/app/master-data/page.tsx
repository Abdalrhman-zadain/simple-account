import { RequireAuth } from "@/components/require-auth";
import { MasterDataPage } from "@/components/master-data-page";

export default function Page() {
    return (
        <RequireAuth>
            <MasterDataPage />
        </RequireAuth>
    );
}
