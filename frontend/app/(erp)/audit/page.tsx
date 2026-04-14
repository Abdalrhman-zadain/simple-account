import dynamic from "next/dynamic";
import { Suspense } from "react";
import { RequireAuth } from "@/components/require-auth";
import { PageSkeleton } from "@/components/ui";

const AuditPage = dynamic(
    () => import("@/features/accounting/audit").then((mod) => mod.AuditPage),
    {
        loading: () => <PageSkeleton />,
    }
);

export default function Page() {
    return (
        <RequireAuth>
            <Suspense>
                <AuditPage />
            </Suspense>
        </RequireAuth>
    );
}
