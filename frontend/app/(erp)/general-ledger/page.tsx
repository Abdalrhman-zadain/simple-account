import dynamic from "next/dynamic";
import { Suspense } from "react";
import { RequireAuth } from "@/components/require-auth";
import { PageSkeleton } from "@/components/ui";

const GeneralLedgerPage = dynamic(
    () => import("@/features/accounting/general-ledger").then((mod) => mod.GeneralLedgerPage),
    {
        loading: () => <PageSkeleton />,
    }
);

export default function Page() {
    return (
        <RequireAuth>
            <Suspense>
                <GeneralLedgerPage />
            </Suspense>
        </RequireAuth>
    );
}
