import dynamic from "next/dynamic";
import { Suspense } from "react";
import { RequireAuth } from "@/components/require-auth";
import { PageSkeleton } from "@/components/ui";

const JournalEntriesPage = dynamic(
    () => import("@/features/accounting/journal-entries").then((mod) => mod.JournalEntriesPage),
    {
        loading: () => <PageSkeleton />,
    }
);

export default function Page() {
    return (
        <RequireAuth>
            <Suspense>
                <JournalEntriesPage />
            </Suspense>
        </RequireAuth>
    );
}
