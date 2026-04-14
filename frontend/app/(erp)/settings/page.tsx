import dynamic from "next/dynamic";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui";

const SettingsPage = dynamic(
    () => import("@/features/settings/settings-page").then((mod) => mod.SettingsPage),
    {
        loading: () => <TableSkeleton />,
    }
);

export default function Page() {
    return (
        <Suspense>
            <SettingsPage />
        </Suspense>
    );
}
