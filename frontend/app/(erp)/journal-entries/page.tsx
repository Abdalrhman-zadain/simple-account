import { RequireAuth } from "@/components/require-auth";
import { JournalEntriesPage } from "@/features/accounting/journal-entries";

export default function Page() {
    return (
        <RequireAuth>
            <JournalEntriesPage />
        </RequireAuth>
    );
}
