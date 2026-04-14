import dynamic from "next/dynamic";
import { Suspense } from "react";
import { RequireAuth } from "@/components/require-auth";
import { PageSkeleton } from "@/components/ui";

const FiscalPage = dynamic(
    () => import("@/features/accounting/fiscal").then((mod) => mod.FiscalPage),
    {
        loading: () => <PageSkeleton />,
    }
);

export default function Page() {
    return (
        <RequireAuth>
            <Suspense>
                <FiscalPage />
            </Suspense>
        </RequireAuth>
    );
}
