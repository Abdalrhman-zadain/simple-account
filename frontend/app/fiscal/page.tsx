import { RequireAuth } from "@/components/require-auth";
import { FiscalPage } from "@/components/fiscal-page";

export default function Page() {
    return (
        <RequireAuth>
            <FiscalPage />
        </RequireAuth>
    );
}
