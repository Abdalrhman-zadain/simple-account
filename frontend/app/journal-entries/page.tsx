import { RequireAuth } from "@/components/require-auth";
import { JournalEntriesPage } from "@/components/journal-entries-page";

export default function Page() {
    return (
        <RequireAuth>
            <JournalEntriesPage />
        </RequireAuth>
    );
}
