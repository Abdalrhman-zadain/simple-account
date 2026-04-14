import dynamic from "next/dynamic";
import { Suspense } from "react";
import { RequireAuth } from "@/components/require-auth";
import { PageSkeleton } from "@/components/ui";

const MasterDataPage = dynamic(
    () => import("@/features/accounting/master-data").then((mod) => mod.MasterDataPage),
    {
        loading: () => <PageSkeleton />,
    }
);

export default function Page() {
    return (
        <RequireAuth>
            <Suspense>
                <MasterDataPage />
            </Suspense>
        </RequireAuth>
    );
}
